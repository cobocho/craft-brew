#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <MQTT.h>
#include <math.h>

// ===================== USER CONFIG =====================
static const char* WIFI_SSID     = CONFIG_WIFI_SSID;
static const char* WIFI_PASSWORD = CONFIG_WIFI_PASSWORD;

static const char* MQTT_HOST = CONFIG_MQTT_HOST;
static const uint16_t MQTT_PORT = CONFIG_MQTT_PORT;
static const char* MQTT_USER = CONFIG_MQTT_USER;
static const char* MQTT_PASS = CONFIG_MQTT_PASS;

static const char* MQTT_CLIENT_ID = CONFIG_MQTT_CLIENT_ID;
static const uint16_t MQTT_KEEPALIVE_SEC = CONFIG_MQTT_KEEPALIVE_SEC;
static const bool MQTT_CLEAN_SESSION = CONFIG_MQTT_CLEAN_SESSION;

static const char* TOPIC_STATUS = "/homebrew/status"; // publish QoS1
static const char* TOPIC_CMD    = "/homebrew/cmd";    // subscribe QoS1
static const char* TOPIC_ACK    = "/homebrew/ack";    // publish QoS2

static const uint16_t HTTP_PORT = 80;

static const int REPORT_INTERVAL_SEC = 1;
static const float TEMP_RAPID_DELTA = 1.0f;
static const float TARGET_MIN = 2.0f;
static const float TARGET_MAX = 30.0f;

// DHT21 (AM2301)
static const int DHT_PIN = 4; // 노란선(DATA)
#define DHTTYPE DHT21
// =======================================================

// ===================== DEBUG CONFIG =====================
bool isDEBUG = true;

#define LOG_WIFI   1
#define LOG_MQTT   1
#define LOG_HTTP   1
#define LOG_SENSOR 1
#define LOG_STATUS 1
#define LOG_CMD    1
// =======================================================

// ===== Objects =====
WebServer http(HTTP_PORT);
Preferences prefs;

WiFiClient net;
MQTTClient mqtt(1024); // buffer size (조금 넉넉히)

WiFiUDP ntpUDP;
NTPClient ntp(ntpUDP, "pool.ntp.org", 0, 10 * 60 * 1000);

DHT dht(DHT_PIN, DHTTYPE);

// ===== State =====
struct StatusState {
  float temp = NAN;
  float humidity = NAN;
  int power = 0; // 실제 제어 미구현 -> 0 고정

  bool hasTarget = false;
  float target = 0.0f;

  bool peltierEnabled = true;

  uint32_t uptimeSec = 0;
  int wifiRssi = 0;
  bool mqttConnected = false;
  uint32_t ts = 0;
};

StatusState gStatus;

unsigned long lastStatusPublishMs = 0;
float lastPublishedTemp = NAN;

unsigned long wifiLastAttemptMs = 0;
unsigned long mqttLastAttemptMs = 0;
uint32_t mqttRetryCount = 0;

static uint32_t nowUnix() {
  if (ntp.isTimeSet()) return (uint32_t)ntp.getEpochTime();
  return 0;
}

static String lastRestartCmdId = "";

// ---------- NVS ----------
static void loadFromNVS() {
  prefs.begin("homebrew", true);
  gStatus.hasTarget      = prefs.getBool("has_target", false);
  gStatus.target         = prefs.getFloat("target", 0.0f);
  gStatus.peltierEnabled = prefs.getBool("peltier_en", true);
  lastRestartCmdId       = prefs.getString("restart_id", "");
  prefs.end();

#if LOG_CMD
  if(isDEBUG) {
    Serial.print("[NVS] hasTarget="); Serial.print(gStatus.hasTarget ? "true" : "false");
    Serial.print(" target="); Serial.print(gStatus.target, 2);
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
  if(isDEBUG) {
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
  if(isDEBUG) {
    Serial.print("[NVS] save peltierEnabled="); Serial.println(en ? "true" : "false");
  }
#endif
}

static void saveRestartCmdIdToNVS(const char* id) {
  prefs.begin("homebrew", false);
  prefs.putString("restart_id", id);
  prefs.end();

#if LOG_CMD
  if(isDEBUG) {
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
  if(isDEBUG) {
    Serial.print("[WIFI] connecting to "); Serial.println(WIFI_SSID);
  }
#endif
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ---------- HTTP ----------
static String buildStatusJson(bool includeExtras) {
  StaticJsonDocument<384> doc;

  if (isfinite(gStatus.temp)) doc["temp"] = (float)(roundf(gStatus.temp * 10.0f) / 10.0f);
  else doc["temp"] = nullptr;

  if (isfinite(gStatus.humidity)) doc["humidity"] = (float)(roundf(gStatus.humidity * 10.0f) / 10.0f);
  else doc["humidity"] = nullptr;

  doc["power"] = 0; // 제어 미구현
  doc["peltier_enabled"] = gStatus.peltierEnabled;

  if (gStatus.hasTarget) doc["target"] = (float)gStatus.target;
  else doc["target"] = nullptr;

  doc["ts"] = gStatus.ts;

  if (includeExtras) {
    doc["uptime"] = gStatus.uptimeSec;
    doc["wifi_rssi"] = gStatus.wifiRssi;
    doc["mqtt_connected"] = gStatus.mqttConnected;
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
    if(isDEBUG) Serial.println("[HTTP] GET /status");
#endif
    http.send(200, "application/json", buildStatusJson(true));
  });

  http.on("/health", HTTP_GET, []() {
#if LOG_HTTP
    if(isDEBUG) Serial.println("[HTTP] GET /health");
#endif
    bool sensorOk = isfinite(gStatus.temp) && isfinite(gStatus.humidity);
    if (sensorOk) http.send(200, "application/json", buildHealthJson(true, nullptr));
    else http.send(503, "application/json", buildHealthJson(false, "sensor_failure"));
  });

  http.onNotFound([]() {
#if LOG_HTTP
    if(isDEBUG) {
      Serial.print("[HTTP] 404 "); Serial.println(http.uri());
    }
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
  ACK_VALUE_NONE  = 0,  // value 필드 없음
  ACK_VALUE_FLOAT = 1,  // value: number
  ACK_VALUE_NULL  = 2,  // value: null
  ACK_VALUE_BOOL  = 3   // value: true/false  ✅ 추가
};

// publishAck가 float/bool 둘 다 지원하도록 확장
static void publishAck(const char* id,
                       const char* cmd,
                       bool success,
                       const char* errorOrNull,
                       AckValueMode valueMode = ACK_VALUE_NONE,
                       float fvalue = 0.0f,
                       bool bvalue = false) {
  StaticJsonDocument<320> doc;
  doc["id"] = id;
  doc["cmd"] = cmd;
  doc["success"] = success;
  doc["error"] = success ? nullptr : errorOrNull;

  if (valueMode == ACK_VALUE_FLOAT) doc["value"] = fvalue;
  else if (valueMode == ACK_VALUE_NULL) doc["value"] = nullptr;
  else if (valueMode == ACK_VALUE_BOOL) doc["value"] = bvalue;

  doc["ts"] = nowUnix();

  String out;
  serializeJson(doc, out);

#if LOG_CMD
  if(isDEBUG) {
    Serial.print("[MQTT] ACK(QoS2) -> "); Serial.print(TOPIC_ACK);
    Serial.print(" payload="); Serial.println(out);
  }
#endif

  mqtt.publish(TOPIC_ACK, out.c_str(), false, 2);
}

static void publishStatus() {
  String body = buildStatusJson(false);

#if LOG_STATUS
  if(isDEBUG) {
    Serial.print("[MQTT] STATUS(QoS1) -> "); Serial.print(TOPIC_STATUS);
    Serial.print(" payload="); Serial.println(body);
  }
#endif

  mqtt.publish(TOPIC_STATUS, body.c_str(), false, 1);

  lastStatusPublishMs = millis();
  if (isfinite(gStatus.temp)) lastPublishedTemp = gStatus.temp;
}

static bool shouldPublishStatus() {
  unsigned long now = millis();

  if (now - lastStatusPublishMs >= (unsigned long)REPORT_INTERVAL_SEC * 1000UL) return true;

  if (isfinite(gStatus.temp) && isfinite(lastPublishedTemp)) {
    if (fabsf(gStatus.temp - lastPublishedTemp) >= TEMP_RAPID_DELTA) return true;
  }

  if (!isfinite(lastPublishedTemp) && isfinite(gStatus.temp)) return true;

  return false;
}

// ---------- Commands ----------
static void handleCommandMessage(const String& payload) {
#if LOG_CMD
  if(isDEBUG) {
    Serial.print("[MQTT] CMD payload="); Serial.println(payload);
  }
#endif

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, payload)) {
#if LOG_CMD
    if(isDEBUG) Serial.println("[MQTT] CMD JSON parse failed");
#endif
    return;
  }

  const char* cmd = doc["cmd"] | "";
  const char* id  = doc["id"]  | "";

  if (strlen(cmd) == 0 || strlen(id) == 0) {
#if LOG_CMD
    if(isDEBUG) Serial.println("[MQTT] CMD missing cmd/id");
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
    if(isDEBUG) {
      Serial.print("[CMD] set_peltier -> "); Serial.println(en ? "true" : "false");
    }
#endif

    // 꺼지면 power 0 강제
    if (!gStatus.peltierEnabled) gStatus.power = 0;

    // ✅ ACK에 적용된 결과(value) 포함
    publishAck(id, cmd, true, nullptr, ACK_VALUE_BOOL, 0.0f, en);
    return;
  }

  // 펠티어 꺼져있으면 조작 금지(=not_ready)
  if (!gStatus.peltierEnabled) {
#if LOG_CMD
    if(isDEBUG) Serial.println("[CMD] rejected: peltier disabled (not_ready)");
#endif
    publishAck(id, cmd, false, "not_ready");
    return;
  }

  // ---- set_target (value: float 2~30 or null) ----
  if (strcmp(cmd, "set_target") == 0) {
    if (doc["value"].isNull()) {
      gStatus.hasTarget = false;
      gStatus.target = 0.0f;
      saveTargetToNVS(false, 0.0f);

#if LOG_CMD
      if(isDEBUG) Serial.println("[CMD] set_target null -> target cleared");
#endif

      // ✅ clear도 value:null로 ACK
      publishAck(id, cmd, true, nullptr, ACK_VALUE_NULL);
      return;
    }

    if (!doc["value"].is<float>() && !doc["value"].is<double>() && !doc["value"].is<int>()) {
      publishAck(id, cmd, false, "invalid_value");
      return;
    }

    float v = doc["value"].as<float>();
    if (v < TARGET_MIN || v > TARGET_MAX) {
      publishAck(id, cmd, false, "invalid_value");
      return;
    }

    gStatus.hasTarget = true;
    gStatus.target = v;
    saveTargetToNVS(true, v);

#if LOG_CMD
    if(isDEBUG) {
      Serial.print("[CMD] set_target -> "); Serial.println(v, 2);
    }
#endif

    // ✅ ACK에 설정 온도 포함
    publishAck(id, cmd, true, nullptr, ACK_VALUE_FLOAT, v);
    return;
  }

  // ---- restart ----
  if (strcmp(cmd, "restart") == 0) {
#if LOG_CMD
    if(isDEBUG) Serial.println("[CMD] restart requested");
#endif
    if (lastRestartCmdId.length() > 0 && lastRestartCmdId == String(id)) {
#if LOG_CMD
      if(isDEBUG) Serial.println("[CMD] restart ignored: duplicate cmd id");
#endif
      return;
    }

    lastRestartCmdId = String(id);
    saveRestartCmdIdToNVS(id);
    publishAck(id, cmd, true, nullptr);
    delay(200);
    ESP.restart();
    return;
  }

  publishAck(id, cmd, false, "invalid_cmd");
}

// arduino-mqtt callback signature
static void onMqttMessage(String& topic, String& payload) {
#if LOG_MQTT
  if(isDEBUG) {
    Serial.print("[MQTT] RX topic="); Serial.print(topic);
    Serial.print(" payload="); Serial.println(payload);
  }
#endif
  if (topic == TOPIC_CMD) handleCommandMessage(payload);
}

// ---------- MQTT connect ----------
static void mqttConfigure() {
  mqtt.begin(MQTT_HOST, MQTT_PORT, net);
  mqtt.onMessage(onMqttMessage);

  mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
  mqtt.setCleanSession(MQTT_CLEAN_SESSION);

  // LWT 설정
  // {"temp":null,"humidity":null,"power":0,"target":null,"ts":0}
  StaticJsonDocument<160> willDoc;
  willDoc["temp"] = nullptr;
  willDoc["humidity"] = nullptr;
  willDoc["power"] = 0;
  willDoc["target"] = nullptr;
  willDoc["ts"] = 0;

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
  if(isDEBUG) {
    Serial.print("[MQTT] connecting to "); Serial.print(MQTT_HOST);
    Serial.print(":"); Serial.print(MQTT_PORT);
    Serial.print(" attempt="); Serial.println(mqttRetryCount + 1);
  }
#endif

  bool ok = mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);

  if (ok) {
    mqttRetryCount = 0;

#if LOG_MQTT
    if(isDEBUG) Serial.println("[MQTT] connected OK");
#endif

    // subscribe QoS1
    mqtt.subscribe(TOPIC_CMD, 1);

#if LOG_MQTT
    if(isDEBUG) {
      Serial.print("[MQTT] subscribed QoS1: "); Serial.println(TOPIC_CMD);
    }
#endif

    // 연결 복구 시: status 즉시 발행
    lastStatusPublishMs = 0;
  } else {
    mqttRetryCount++;
#if LOG_MQTT
    if(isDEBUG) Serial.println("[MQTT] connect failed");
#endif
  }
}

// ---------- Sensors ----------
static void readSensorsDHT21() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(t) || isnan(h)) {
    gStatus.temp = NAN;
    gStatus.humidity = NAN;
#if LOG_SENSOR
    if(isDEBUG) Serial.println("[SENSOR] DHT read failed (NaN)");
#endif
    return;
  }

  gStatus.temp = t;
  gStatus.humidity = h;

#if LOG_SENSOR
  if(isDEBUG) {
    Serial.print("[SENSOR] temp="); Serial.print(gStatus.temp, 1);
    Serial.print("C hum="); Serial.print(gStatus.humidity, 1);
    Serial.println("%");
  }
#endif
}

// ---------- Runtime fields ----------
static void updateRuntimeFields() {
  gStatus.uptimeSec = millis() / 1000;
  gStatus.wifiRssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  gStatus.mqttConnected = mqtt.connected();
  gStatus.ts = nowUnix();

  // 펠티어 OFF면 power 0 강제
  if (!gStatus.peltierEnabled) gStatus.power = 0;
  else gStatus.power = 0; // 제어 미구현이라 항상 0
}

// ---------- Setup/Loop ----------
void setup() {
  // SERIAL CHECK
  if(isDEBUG) {
    Serial.begin(115200);
    delay(200);

    if(!Serial) { isDEBUG = false; Serial.end(); }
  }

  if(isDEBUG) {
    Serial.println("==================================");
    Serial.println(" Homebrew MCU (arduino-mqtt)");
    Serial.println(" status QoS1 / ack QoS2");
    Serial.println("==================================");
  }

  loadFromNVS();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  setupHttpRoutes();
  http.begin();

  dht.begin();
  ntp.begin();

  mqttConfigure();
}

void loop() {
  wifiConnectNonBlocking();

  // WiFi state change log
  static bool wifiWasConnected = false;
  bool wifiNow = (WiFi.status() == WL_CONNECTED);
  if (wifiNow && !wifiWasConnected) {
#if LOG_WIFI
    if(isDEBUG) {
      Serial.print("[WIFI] connected! IP="); Serial.println(WiFi.localIP());
    }
#endif
  }
  if (!wifiNow && wifiWasConnected) {
#if LOG_WIFI
    if(isDEBUG) Serial.println("[WIFI] disconnected");
#endif
  }
  wifiWasConnected = wifiNow;

  http.handleClient();

  if (wifiNow) ntp.update();

  // MQTT connect + loop
  mqttConnectNonBlocking();
  mqtt.loop();

  // ---- 1초마다 스캔 ----
  static unsigned long lastScanMs = 0;
  unsigned long now = millis();
  if (now - lastScanMs >= 1000) {
    lastScanMs = now;

    readSensorsDHT21();
    updateRuntimeFields();

    if (mqtt.connected() && shouldPublishStatus()) {
      publishStatus();
    }
  }

  delay(10);
}
