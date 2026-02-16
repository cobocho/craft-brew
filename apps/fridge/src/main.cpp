#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <MQTTClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ElegantOTA.h>
#include <DHT.h>
#include <math.h>

// ===================== USER CONFIG =====================
static const char* WIFI_SSID         = CONFIG_WIFI_SSID;
static const char* WIFI_PASSWORD     = CONFIG_WIFI_PASSWORD;

static const char* MQTT_HOST         = CONFIG_MQTT_HOST;
static const uint16_t MQTT_PORT      = CONFIG_MQTT_PORT;
static const char* MQTT_USER         = CONFIG_MQTT_USER;
static const char* MQTT_PASS         = CONFIG_MQTT_PASS;
static const char* MQTT_CLIENT_ID    = CONFIG_MQTT_CLIENT_ID;
static const uint16_t MQTT_KEEPALIVE_SEC = CONFIG_MQTT_KEEPALIVE_SEC;
static const bool MQTT_CLEAN_SESSION = CONFIG_MQTT_CLEAN_SESSION;

static const char* TOPIC_STATUS      = "/homebrew/status";   // publish QoS1
static const char* TOPIC_CMD         = "/homebrew/cmd";      // subscribe QoS1
static const char* TOPIC_ACK         = "/homebrew/ack";      // publish QoS2

static const uint16_t HTTP_PORT          = 80;
static const int       REPORT_INTERVAL_SEC = 1;
static const float     TEMP_RAPID_DELTA    = 1.0f;
static const float     TARGET_MIN          = 2.0f;
static const float     TARGET_MAX          = 30.0f;

// Sensor sanity check
static const float SENSOR_TEMP_MIN       = -10.0f;   // 물리적으로 가능한 최저 온도
static const float SENSOR_TEMP_MAX       = 50.0f;    // 물리적으로 가능한 최고 온도
static const float SENSOR_HUM_MIN        = 5.0f;     // 최소 습도
static const float SENSOR_HUM_MAX        = 99.0f;    // 최대 습도
static const float SENSOR_TEMP_MAX_DELTA = 3.0f;     // 연속 읽기 간 최대 허용 온도 변화 (°C)
static const float SENSOR_HUM_MAX_DELTA  = 10.0f;    // 연속 읽기 간 최대 허용 습도 변화 (%)

// DHT21 (AM2301)
static const int DHT_PIN = 4;           // 노란선(DATA)
#define DHTTYPE DHT21

// ===================== PELTIER CONFIG =====================
static const int   PELTIER_PIN       = 18;          // MOSFET gate PWM 핀
static const int   PELTIER_PWM_CH    = 0;           // LEDC 채널
static const int   PELTIER_PWM_FREQ  = 25000;       // 25kHz PWM (MOSFET 스위칭에 적합)
static const int   PELTIER_PWM_RES   = 8;           // 8비트 해상도 (0~255)
static const int   PELTIER_PWM_MAX   = 255;
static const int   PELTIER_PWM_MIN   = 0;

// ===================== PID CONFIG =========================
// 냉각 전용: error = temp - target (양수 = 냉각 필요)
static const float PID_KP_DEFAULT    = 30.0f;   // 비례 게인
static const float PID_KI_DEFAULT    = 0.5f;    // 적분 게인
static const float PID_KD_DEFAULT    = 10.0f;   // 미분 게인
static const float PID_INTEGRAL_MAX  = 200.0f;  // 적분 와인드업 방지 상한
static const float PID_INTEGRAL_MIN  = -50.0f;  // 적분 와인드업 방지 하한 (역방향 제한)
static const float PID_DEADBAND      = 0.2f;    // ±0.2°C 이내면 현재 출력 유지
static const float PID_COMPUTE_SEC   = 1.0f;    // PID 연산 주기 (초)

// 냉각 시작/정지 히스테리시스
static const float COOL_START_OFFSET = 0.3f;    // target + 0.3°C 이상이면 냉각 시작
static const float COOL_STOP_OFFSET  = -0.1f;   // target - 0.1°C 이하면 냉각 정지

// 안전 제한
static const float PELTIER_MAX_DUTY_PCT = 85.0f;   // 최대 듀티 85% (과열 방지)
static const int   PELTIER_ABS_MAX_PWM  = (int)(PELTIER_PWM_MAX * PELTIER_MAX_DUTY_PCT / 100.0f);

// =========================================================

// ===================== DEBUG CONFIG =====================
bool isDEBUG = true;
#define LOG_WIFI    1
#define LOG_MQTT    1
#define LOG_HTTP    1
#define LOG_SENSOR  1
#define LOG_STATUS  1
#define LOG_CMD     1
#define LOG_PID     1
// =======================================================

// ===== Objects =====
WebServer    http(HTTP_PORT);
Preferences  prefs;
WiFiClient   net;
MQTTClient   mqtt(1024);
WiFiUDP      ntpUDP;
NTPClient    ntp(ntpUDP, "pool.ntp.org", 0, 10 * 60 * 1000);
DHT          dht(DHT_PIN, DHTTYPE);

// ===== PID State =====
struct PIDState {
  float kp           = PID_KP_DEFAULT;
  float ki           = PID_KI_DEFAULT;
  float kd           = PID_KD_DEFAULT;
  float integral     = 0.0f;
  float prevError    = 0.0f;
  bool  firstRun     = true;
  float outputPct    = 0.0f;     // 0~100 (%)
  int   outputPWM    = 0;        // 0~255 실제 출력
  bool  coolingActive = false;   // 냉각 중 여부 (히스테리시스용)
  unsigned long lastComputeMs = 0;
};
PIDState pid;

// ===== State =====
struct StatusState {
  float    temp           = NAN;
  float    humidity       = NAN;
  int      power          = 0;       // 0~100 (%) PID 출력
  bool     hasTarget      = false;
  float    target         = 0.0f;
  bool     peltierEnabled = true;
  uint32_t uptimeSec      = 0;
  int      wifiRssi       = 0;
  bool     mqttConnected  = false;
  uint32_t ts             = 0;
};
StatusState gStatus;

unsigned long lastStatusPublishMs  = 0;
float         lastPublishedTemp    = NAN;
unsigned long wifiLastAttemptMs    = 0;
unsigned long mqttLastAttemptMs    = 0;
uint32_t      mqttRetryCount       = 0;

static uint32_t nowUnix() {
  if (ntp.isTimeSet()) return (uint32_t)ntp.getEpochTime();
  return 0;
}

static String lastRestartCmdId = "";

// ==================== Peltier PWM ====================
static void peltierSetup() {
  ledcSetup(PELTIER_PWM_CH, PELTIER_PWM_FREQ, PELTIER_PWM_RES);
  ledcAttachPin(PELTIER_PIN, PELTIER_PWM_CH);
  ledcWrite(PELTIER_PWM_CH, 0);  // 초기: OFF
#if LOG_PID
  if (isDEBUG) {
    Serial.printf("[PELTIER] PWM init pin=%d ch=%d freq=%dHz res=%dbit\n",
                  PELTIER_PIN, PELTIER_PWM_CH, PELTIER_PWM_FREQ, PELTIER_PWM_RES);
  }
#endif
}

static void peltierWrite(int pwmVal) {
  if (pwmVal < PELTIER_PWM_MIN) pwmVal = PELTIER_PWM_MIN;
  if (pwmVal > PELTIER_ABS_MAX_PWM) pwmVal = PELTIER_ABS_MAX_PWM;
  ledcWrite(PELTIER_PWM_CH, pwmVal);
}

static void peltierOff() {
  peltierWrite(0);
  pid.outputPct    = 0.0f;
  pid.outputPWM    = 0;
  pid.integral     = 0.0f;
  pid.prevError    = 0.0f;
  pid.firstRun     = true;
  pid.coolingActive = false;
}

// ==================== PID 연산 ====================
static void pidCompute() {
  // 전제조건 확인
  if (!gStatus.peltierEnabled || !gStatus.hasTarget || !isfinite(gStatus.temp)) {
    if (pid.outputPWM != 0) {
      peltierOff();
      gStatus.power = 0;
#if LOG_PID
      if (isDEBUG) Serial.println("[PID] OFF (precondition not met)");
#endif
    }
    return;
  }

  unsigned long now = millis();
  if (now - pid.lastComputeMs < (unsigned long)(PID_COMPUTE_SEC * 1000.0f)) return;
  pid.lastComputeMs = now;

  float error = gStatus.temp - gStatus.target;  // 양수 = 현재 온도가 높음 = 냉각 필요

  // --- 히스테리시스: 냉각 시작/정지 판단 ---
  if (!pid.coolingActive) {
    // 냉각 OFF 상태: target + COOL_START_OFFSET 이상이면 냉각 시작
    if (error > COOL_START_OFFSET) {
      pid.coolingActive = true;
      pid.integral  = 0.0f;
      pid.firstRun  = true;
#if LOG_PID
      if (isDEBUG) Serial.printf("[PID] cooling START (temp=%.1f target=%.1f err=%.2f)\n",
                                  gStatus.temp, gStatus.target, error);
#endif
    } else {
      // 냉각 불필요 -> 출력 0 유지
      if (pid.outputPWM != 0) {
        peltierOff();
        gStatus.power = 0;
#if LOG_PID
        if (isDEBUG) Serial.println("[PID] OFF (below start threshold)");
#endif
      }
      return;
    }
  } else {
    // 냉각 ON 상태: target + COOL_STOP_OFFSET 이하면 냉각 정지
    if (error < COOL_STOP_OFFSET) {
      pid.coolingActive = false;
      peltierOff();
      gStatus.power = 0;
#if LOG_PID
      if (isDEBUG) Serial.printf("[PID] cooling STOP (temp=%.1f target=%.1f err=%.2f)\n",
                                  gStatus.temp, gStatus.target, error);
#endif
      return;
    }
  }

  // --- 데드밴드: 목표 근처에서 미세 진동 방지 ---
  float dt = PID_COMPUTE_SEC;

  // Proportional
  float P = pid.kp * error;

  // Integral (데드밴드 밖에서만 적분)
  if (fabsf(error) > PID_DEADBAND) {
    pid.integral += error * dt;
  }
  // 와인드업 클램프
  if (pid.integral > PID_INTEGRAL_MAX)  pid.integral = PID_INTEGRAL_MAX;
  if (pid.integral < PID_INTEGRAL_MIN)  pid.integral = PID_INTEGRAL_MIN;
  float I = pid.ki * pid.integral;

  // Derivative (kick 방지: 에러 미분 대신 에러 변화 사용)
  float D = 0.0f;
  if (!pid.firstRun) {
    float dError = (error - pid.prevError) / dt;
    D = pid.kd * dError;
  }
  pid.prevError = error;
  pid.firstRun  = false;

  // PID 출력 (0~100%)
  float output = P + I + D;
  if (output < 0.0f)   output = 0.0f;
  if (output > 100.0f) output = 100.0f;

  // % → PWM 변환
  int pwm = (int)((output / 100.0f) * (float)PELTIER_ABS_MAX_PWM);
  if (pwm < 0)                  pwm = 0;
  if (pwm > PELTIER_ABS_MAX_PWM) pwm = PELTIER_ABS_MAX_PWM;

  pid.outputPct = output;
  pid.outputPWM = pwm;
  gStatus.power = (int)(output + 0.5f);  // 반올림하여 0~100%

  peltierWrite(pwm);

#if LOG_PID
  if (isDEBUG) {
    Serial.printf("[PID] temp=%.1f target=%.1f err=%.2f | P=%.1f I=%.1f(int=%.1f) D=%.1f | out=%.1f%% pwm=%d/%d\n",
                  gStatus.temp, gStatus.target, error,
                  P, I, pid.integral, D,
                  output, pwm, PELTIER_ABS_MAX_PWM);
  }
#endif
}

// ---------- NVS ----------
static void loadFromNVS() {
  prefs.begin("homebrew", true);
  gStatus.hasTarget      = prefs.getBool("has_target", false);
  gStatus.target         = prefs.getFloat("target", 0.0f);
  gStatus.peltierEnabled = prefs.getBool("peltier_en", true);
  lastRestartCmdId       = prefs.getString("restart_id", "");
  prefs.end();
#if LOG_CMD
  if (isDEBUG) {
    Serial.print("[NVS] hasTarget="); Serial.print(gStatus.hasTarget ? "true" : "false");
    Serial.print(" target=");         Serial.print(gStatus.target, 2);
    Serial.print(" peltierEnabled="); Serial.println(gStatus.peltierEnabled ? "true" : "false");
    Serial.print("[NVS] lastRestartCmdId="); Serial.println(lastRestartCmdId);
  }
#endif
}

static void saveTargetToNVS(bool hasTarget, float target) {
  prefs.begin("homebrew", false);
  prefs.putBool("has_target", hasTarget);
  prefs.putFloat("target", target);
  prefs.end();
#if LOG_CMD
  if (isDEBUG) {
    Serial.print("[NVS] save target hasTarget="); Serial.print(hasTarget ? "true" : "false");
    Serial.print(" target="); Serial.println(target, 2);
  }
#endif
}

static void savePeltierEnabledToNVS(bool en) {
  prefs.begin("homebrew", false);
  prefs.putBool("peltier_en", en);
  prefs.end();
#if LOG_CMD
  if (isDEBUG) {
    Serial.print("[NVS] save peltierEnabled="); Serial.println(en ? "true" : "false");
  }
#endif
}

static void saveRestartCmdIdToNVS(const char* id) {
  prefs.begin("homebrew", false);
  prefs.putString("restart_id", id);
  prefs.end();
#if LOG_CMD
  if (isDEBUG) {
    Serial.print("[NVS] save restart_id="); Serial.println(id);
  }
#endif
}

// ---------- WiFi ----------
static void wifiConnectNonBlocking() {
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - wifiLastAttemptMs < 3000) return;
  wifiLastAttemptMs = now;
#if LOG_WIFI
  if (isDEBUG) { Serial.print("[WIFI] connecting to "); Serial.println(WIFI_SSID); }
#endif
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ---------- HTTP ----------
static String buildStatusJson(bool includeExtras) {
  StaticJsonDocument<512> doc;
  if (isfinite(gStatus.temp))
    doc["temp"] = (float)(roundf(gStatus.temp * 10.0f) / 10.0f);
  else
    doc["temp"] = nullptr;
  if (isfinite(gStatus.humidity))
    doc["humidity"] = (float)(roundf(gStatus.humidity * 10.0f) / 10.0f);
  else
    doc["humidity"] = nullptr;

  doc["power"]           = gStatus.power;
  doc["peltier_enabled"] = gStatus.peltierEnabled;

  if (gStatus.hasTarget)
    doc["target"] = (float)gStatus.target;
  else
    doc["target"] = nullptr;

  doc["ts"] = gStatus.ts;

  if (includeExtras) {
    doc["uptime"]         = gStatus.uptimeSec;
    doc["wifi_rssi"]      = gStatus.wifiRssi;
    doc["mqtt_connected"] = gStatus.mqttConnected;
    // PID 디버그 정보
    JsonObject pidInfo    = doc.createNestedObject("pid");
    pidInfo["kp"]         = pid.kp;
    pidInfo["ki"]         = pid.ki;
    pidInfo["kd"]         = pid.kd;
    pidInfo["integral"]   = (float)(roundf(pid.integral * 10.0f) / 10.0f);
    pidInfo["output_pct"] = (float)(roundf(pid.outputPct * 10.0f) / 10.0f);
    pidInfo["pwm"]        = pid.outputPWM;
    pidInfo["cooling"]    = pid.coolingActive;
  }

  String out;
  serializeJson(doc, out);
  return out;
}

static String buildHealthJson(bool ok, const char* errCodeOrNull) {
  StaticJsonDocument<160> doc;
  doc["status"] = ok ? "ok" : "error";
  if (!ok) doc["error"] = errCodeOrNull;
  doc["uptime"] = gStatus.uptimeSec;
  String out;
  serializeJson(doc, out);
  return out;
}

static void setupHttpRoutes() {
  http.on("/status", HTTP_GET, []() {
#if LOG_HTTP
    if (isDEBUG) Serial.println("[HTTP] GET /status");
#endif
    http.send(200, "application/json", buildStatusJson(true));
  });

  http.on("/health", HTTP_GET, []() {
#if LOG_HTTP
    if (isDEBUG) Serial.println("[HTTP] GET /health");
#endif
    bool sensorOk = isfinite(gStatus.temp) && isfinite(gStatus.humidity);
    if (sensorOk)
      http.send(200, "application/json", buildHealthJson(true, nullptr));
    else
      http.send(503, "application/json", buildHealthJson(false, "sensor_failure"));
  });

  // PID 튜닝 엔드포인트 (GET으로 조회, POST로 변경)
  http.on("/pid", HTTP_GET, []() {
#if LOG_HTTP
    if (isDEBUG) Serial.println("[HTTP] GET /pid");
#endif
    StaticJsonDocument<128> doc;
    doc["kp"] = pid.kp;
    doc["ki"] = pid.ki;
    doc["kd"] = pid.kd;
    String out;
    serializeJson(doc, out);
    http.send(200, "application/json", out);
  });

  http.on("/pid", HTTP_POST, []() {
#if LOG_HTTP
    if (isDEBUG) Serial.println("[HTTP] POST /pid");
#endif
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, http.arg("plain"))) {
      http.send(400, "application/json", "{\"error\":\"invalid_json\"}");
      return;
    }
    if (doc.containsKey("kp")) pid.kp = doc["kp"].as<float>();
    if (doc.containsKey("ki")) pid.ki = doc["ki"].as<float>();
    if (doc.containsKey("kd")) pid.kd = doc["kd"].as<float>();
    // 적분 리셋 (게인 변경 시)
    pid.integral = 0.0f;
    pid.firstRun = true;
#if LOG_PID
    if (isDEBUG) Serial.printf("[PID] tuning updated kp=%.2f ki=%.2f kd=%.2f\n", pid.kp, pid.ki, pid.kd);
#endif
    StaticJsonDocument<128> resp;
    resp["kp"] = pid.kp;
    resp["ki"] = pid.ki;
    resp["kd"] = pid.kd;
    String out;
    serializeJson(resp, out);
    http.send(200, "application/json", out);
  });

  http.on("/", HTTP_GET, []() {
    http.send(200, "text/html",
      "<html><body style='font-family:monospace;padding:20px'>"
      "<h2>Homebrew MCU</h2>"
      "<ul>"
      "<li><a href='/status'>/status</a></li>"
      "<li><a href='/health'>/health</a></li>"
      "<li><a href='/pid'>/pid</a> (GET=조회, POST=튜닝)</li>"
      "<li><a href='/update'>/update</a> (OTA)</li>"
      "</ul></body></html>");
  });

  http.onNotFound([]() {
#if LOG_HTTP
    if (isDEBUG) { Serial.print("[HTTP] 404 "); Serial.println(http.uri()); }
#endif
    http.send(404, "text/plain", "Not Found");
  });
}

// ---------- MQTT reconnect backoff ----------
static unsigned long mqttBackoffMs(uint32_t attempt) {
  if (attempt <= 1) return 1000;
  if (attempt == 2) return 2000;
  if (attempt == 3) return 4000;
  if (attempt == 4) return 8000;
  return 60000;
}

// ---------- MQTT publish helpers ----------
enum AckValueMode : uint8_t {
  ACK_VALUE_NONE  = 0,
  ACK_VALUE_FLOAT = 1,
  ACK_VALUE_NULL  = 2,
  ACK_VALUE_BOOL  = 3
};

static void publishAck(const char* id, const char* cmd, bool success,
                        const char* errorOrNull,
                        AckValueMode valueMode = ACK_VALUE_NONE,
                        float fvalue = 0.0f, bool bvalue = false) {
  StaticJsonDocument<320> doc;
  doc["id"]      = id;
  doc["cmd"]     = cmd;
  doc["success"] = success;
  doc["error"]   = success ? nullptr : errorOrNull;
  if      (valueMode == ACK_VALUE_FLOAT) doc["value"] = fvalue;
  else if (valueMode == ACK_VALUE_NULL)  doc["value"] = nullptr;
  else if (valueMode == ACK_VALUE_BOOL)  doc["value"] = bvalue;
  doc["ts"] = nowUnix();

  String out;
  serializeJson(doc, out);
#if LOG_CMD
  if (isDEBUG) { Serial.print("[MQTT] ACK(QoS2) -> "); Serial.print(TOPIC_ACK); Serial.print(" payload="); Serial.println(out); }
#endif
  mqtt.publish(TOPIC_ACK, out.c_str(), false, 2);
}

static void publishStatus() {
  String body = buildStatusJson(false);
#if LOG_STATUS
  if (isDEBUG) { Serial.print("[MQTT] STATUS(QoS1) -> "); Serial.print(TOPIC_STATUS); Serial.print(" payload="); Serial.println(body); }
#endif
  mqtt.publish(TOPIC_STATUS, body.c_str(), false, 1);
  lastStatusPublishMs = millis();
  if (isfinite(gStatus.temp)) lastPublishedTemp = gStatus.temp;
}

static bool shouldPublishStatus() {
  unsigned long now = millis();
  if (now - lastStatusPublishMs >= (unsigned long)REPORT_INTERVAL_SEC * 1000UL)
    return true;
  if (isfinite(gStatus.temp) && isfinite(lastPublishedTemp)) {
    if (fabsf(gStatus.temp - lastPublishedTemp) >= TEMP_RAPID_DELTA)
      return true;
  }
  if (!isfinite(lastPublishedTemp) && isfinite(gStatus.temp))
    return true;
  return false;
}

// ---------- Commands ----------
static void handleCommandMessage(const String& payload) {
#if LOG_CMD
  if (isDEBUG) { Serial.print("[MQTT] CMD payload="); Serial.println(payload); }
#endif
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, payload)) {
#if LOG_CMD
    if (isDEBUG) Serial.println("[MQTT] CMD JSON parse failed");
#endif
    return;
  }
  const char* cmd = doc["cmd"] | "";
  const char* id  = doc["id"]  | "";
  if (strlen(cmd) == 0 || strlen(id) == 0) {
#if LOG_CMD
    if (isDEBUG) Serial.println("[MQTT] CMD missing cmd/id");
#endif
    return;
  }

  // ---- set_peltier (value: true/false) ----
  if (strcmp(cmd, "set_peltier") == 0) {
    if (!doc.containsKey("value") || (!doc["value"].is<bool>() && !doc["value"].is<int>())) {
      publishAck(id, cmd, false, "invalid_value");
      return;
    }
    bool en = doc["value"].as<bool>();
    gStatus.peltierEnabled = en;
    savePeltierEnabledToNVS(en);
#if LOG_CMD
    if (isDEBUG) { Serial.print("[CMD] set_peltier -> "); Serial.println(en ? "true" : "false"); }
#endif
    if (!en) {
      peltierOff();
      gStatus.power = 0;
    }
    publishAck(id, cmd, true, nullptr, ACK_VALUE_BOOL, 0.0f, en);
    return;
  }

  // 펠티어 비활성 상태에서 다른 제어 명령 거부
  if (!gStatus.peltierEnabled) {
#if LOG_CMD
    if (isDEBUG) Serial.println("[CMD] rejected: peltier disabled (not_ready)");
#endif
    publishAck(id, cmd, false, "not_ready");
    return;
  }

  // ---- set_target ----
  if (strcmp(cmd, "set_target") == 0) {
    if (doc["value"].isNull()) {
      gStatus.hasTarget = false;
      gStatus.target    = 0.0f;
      saveTargetToNVS(false, 0.0f);
      peltierOff();
      gStatus.power = 0;
#if LOG_CMD
      if (isDEBUG) Serial.println("[CMD] set_target null -> target cleared, peltier off");
#endif
      publishAck(id, cmd, true, nullptr, ACK_VALUE_NULL);
      return;
    }
    if (!doc["value"].is<float>() && !doc["value"].is<int>() && !doc["value"].is<double>()) {
      publishAck(id, cmd, false, "invalid_value");
      return;
    }
    float v = doc["value"].as<float>();
    if (v < TARGET_MIN || v > TARGET_MAX) {
      publishAck(id, cmd, false, "invalid_value");
      return;
    }
    gStatus.hasTarget = true;
    gStatus.target    = v;
    saveTargetToNVS(true, v);
    // 목표 변경 시 PID 적분 리셋
    pid.integral = 0.0f;
    pid.firstRun = true;
#if LOG_CMD
    if (isDEBUG) { Serial.print("[CMD] set_target -> "); Serial.println(v, 2); }
#endif
    publishAck(id, cmd, true, nullptr, ACK_VALUE_FLOAT, v);
    return;
  }

  // ---- restart ----
  if (strcmp(cmd, "restart") == 0) {
#if LOG_CMD
    if (isDEBUG) Serial.println("[CMD] restart requested");
#endif
    if (lastRestartCmdId.length() > 0 && lastRestartCmdId == String(id)) {
#if LOG_CMD
      if (isDEBUG) Serial.println("[CMD] restart ignored: duplicate cmd id");
#endif
      return;
    }
    lastRestartCmdId = String(id);
    saveRestartCmdIdToNVS(id);
    peltierOff();  // 안전: 재시작 전 펠티어 OFF
    publishAck(id, cmd, true, nullptr);
    delay(200);
    ESP.restart();
    return;
  }

  publishAck(id, cmd, false, "invalid_cmd");
}

static void onMqttMessage(String& topic, String& payload) {
#if LOG_MQTT
  if (isDEBUG) { Serial.print("[MQTT] RX topic="); Serial.print(topic); Serial.print(" payload="); Serial.println(payload); }
#endif
  if (topic == TOPIC_CMD) handleCommandMessage(payload);
}

static void mqttConfigure() {
  mqtt.begin(MQTT_HOST, MQTT_PORT, net);
  mqtt.onMessage(onMqttMessage);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
  mqtt.setCleanSession(MQTT_CLEAN_SESSION);

  StaticJsonDocument<160> willDoc;
  willDoc["temp"]     = nullptr;
  willDoc["humidity"] = nullptr;
  willDoc["power"]    = 0;
  willDoc["target"]   = nullptr;
  willDoc["ts"]       = 0;
  String willMsg;
  serializeJson(willDoc, willMsg);
  mqtt.setWill(TOPIC_STATUS, willMsg.c_str(), true, 1);
}

static void mqttConnectNonBlocking() {
  if (mqtt.connected()) return;
  if (WiFi.status() != WL_CONNECTED) return;
  unsigned long now = millis();
  unsigned long waitMs = mqttBackoffMs(mqttRetryCount == 0 ? 1 : mqttRetryCount);
  if (now - mqttLastAttemptMs < waitMs) return;
  mqttLastAttemptMs = now;
#if LOG_MQTT
  if (isDEBUG) {
    Serial.print("[MQTT] connecting to "); Serial.print(MQTT_HOST);
    Serial.print(":"); Serial.print(MQTT_PORT);
    Serial.print(" attempt="); Serial.println(mqttRetryCount + 1);
  }
#endif
  bool ok = mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
  if (ok) {
    mqttRetryCount = 0;
#if LOG_MQTT
    if (isDEBUG) Serial.println("[MQTT] connected OK");
#endif
    mqtt.subscribe(TOPIC_CMD, 1);
#if LOG_MQTT
    if (isDEBUG) { Serial.print("[MQTT] subscribed QoS1: "); Serial.println(TOPIC_CMD); }
#endif
    lastStatusPublishMs = 0;
  } else {
    mqttRetryCount++;
#if LOG_MQTT
    if (isDEBUG) Serial.println("[MQTT] connect failed");
#endif
  }
}

// ---------- Sensor ----------
static bool readSensorsDHT21() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // 1) NaN 체크 (DHT 라이브러리 통신 실패)
  if (isnan(t) || isnan(h)) {
#if LOG_SENSOR
    if (isDEBUG) Serial.println("[SENSOR] DHT read skipped (NaN)");
#endif
    return false;
  }

  // 2) 물리적 범위 체크 (829.9°C, -11.4°C 같은 비정상값 차단)
  if (t < SENSOR_TEMP_MIN || t > SENSOR_TEMP_MAX ||
      h < SENSOR_HUM_MIN  || h > SENSOR_HUM_MAX) {
#if LOG_SENSOR
    if (isDEBUG) Serial.printf("[SENSOR] out of range rejected: t=%.1f h=%.1f\n", t, h);
#endif
    return false;
  }

  // 3) 급격한 변화 체크 (직전 유효값 대비 스파이크 차단)
  //    첫 읽기(gStatus.temp == NAN)일 때는 건너뜀
  if (isfinite(gStatus.temp)) {
    float dT = fabsf(t - gStatus.temp);
    float dH = fabsf(h - gStatus.humidity);
    if (dT > SENSOR_TEMP_MAX_DELTA || dH > SENSOR_HUM_MAX_DELTA) {
#if LOG_SENSOR
      if (isDEBUG) Serial.printf("[SENSOR] spike rejected: t=%.1f(Δ%.1f) h=%.1f(Δ%.1f)\n",
                                  t, dT, h, dH);
#endif
      return false;
    }
  }

  // 모든 검증 통과 → 전역 상태 업데이트
  gStatus.temp     = t;
  gStatus.humidity = h;
#if LOG_SENSOR
  if (isDEBUG) {
    Serial.print("[SENSOR] temp="); Serial.print(gStatus.temp, 1);
    Serial.print("C hum="); Serial.print(gStatus.humidity, 1); Serial.println("%");
  }
#endif
  return true;
}

static void updateRuntimeFields() {
  gStatus.uptimeSec     = millis() / 1000;
  gStatus.wifiRssi      = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  gStatus.mqttConnected = mqtt.connected();
  gStatus.ts            = nowUnix();
}

// ==================== SETUP ====================
void setup() {
  if (isDEBUG) {
    Serial.begin(115200);
    delay(200);
    if (!Serial) {
      isDEBUG = false;
      Serial.end();
    }
  }

  if (isDEBUG) {
    Serial.println("==================================");
    Serial.println("  Homebrew MCU (PID Peltier)");
    Serial.println("  status QoS1 / ack QoS2");
    Serial.println("==================================");
  }

  loadFromNVS();

  // 펠티어 PWM 초기화
  peltierSetup();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  setupHttpRoutes();

  ElegantOTA.begin(&http);
  ElegantOTA.onStart([]() {
    peltierOff();  // OTA 중 안전을 위해 펠티어 OFF
    if (isDEBUG) Serial.println("[OTA] Start - peltier OFF for safety");
  });
  ElegantOTA.onEnd([](bool success) {
    if (isDEBUG) Serial.printf("[OTA] End success=%s\n", success ? "true" : "false");
  });
  ElegantOTA.onProgress([](size_t current, size_t final) {
    if (isDEBUG) Serial.printf("[OTA] Progress: %u%%\r", (unsigned)((current * 100) / final));
  });

  http.begin();
  dht.begin();
  ntp.begin();
  mqttConfigure();
}

// ==================== LOOP ====================
void loop() {
  // WiFi
  wifiConnectNonBlocking();
  static bool wifiWasConnected = false;
  bool wifiNow = (WiFi.status() == WL_CONNECTED);
  if (wifiNow && !wifiWasConnected) {
#if LOG_WIFI
    if (isDEBUG) {
      Serial.print("[WIFI] connected! IP="); Serial.println(WiFi.localIP());
      Serial.println("[OTA] Open http://<ip>/update");
    }
#endif
  }
  if (!wifiNow && wifiWasConnected) {
#if LOG_WIFI
    if (isDEBUG) Serial.println("[WIFI] disconnected");
#endif
  }
  wifiWasConnected = wifiNow;

  // HTTP + OTA
  http.handleClient();
  ElegantOTA.loop();

  // NTP
  if (wifiNow) ntp.update();

  // MQTT
  mqttConnectNonBlocking();
  mqtt.loop();

  // 1초 주기 작업: 센서 읽기 + PID + 상태 발행
  static unsigned long lastScanMs = 0;
  unsigned long now = millis();
  if (now - lastScanMs >= 2000) {  // DHT21 최소 샘플링 간격 2초
    lastScanMs = now;

    bool sensorOk = readSensorsDHT21();
    updateRuntimeFields();

    // PID 연산: 센서 읽기 성공 시에만 수행
    if (sensorOk) {
      pidCompute();
    }

    if (mqtt.connected() && shouldPublishStatus()) {
      publishStatus();
    }
  }

  delay(10);
}