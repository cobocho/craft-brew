#include <WiFi.h>
#include <WebServer.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <DHT.h>

// ===================== USER CONFIG =====================
static const char* WIFI_SSID     = "WIFI_SSID";
static const char* WIFI_PASSWORD = "WIFI_PASSWORD";

static const char* MQTT_HOST = "MQTT_HOST";
static const uint16_t MQTT_PORT = MQTT_PORT;
static const char* MQTT_USER = "MQTT_USER";
static const char* MQTT_PASS = "MQTT_PASS";

static const char* MQTT_CLIENT_ID = "homebrew-mcu-01";
static const uint16_t MQTT_KEEPALIVE_SEC = 60;

static const char* TOPIC_STATUS = "/homebrew/status";
static const char* TOPIC_CMD    = "/homebrew/cmd";
static const char* TOPIC_ACK    = "/homebrew/ack";

static const uint16_t HTTP_PORT = 80;

static const int REPORT_INTERVAL_SEC = 60;
static const float TEMP_RAPID_DELTA = 1.0f; // 급변 기준(임의): 1.0°C
static const float TARGET_MIN = 2.0f;
static const float TARGET_MAX = 30.0f;

// DHT21 (AM2301)
static const int DHT_PIN = 4; // 노란선(DATA) 연결 핀
#define DHTTYPE DHT21
// =======================================================

// ===================== DEBUG CONFIG =====================
#define LOG_WIFI   1
#define LOG_MQTT   1
#define LOG_HTTP   1
#define LOG_SENSOR 1
#define LOG_STATUS 1
#define LOG_CMD    1
// =======================================================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
WebServer http(HTTP_PORT);

Preferences prefs;

WiFiUDP ntpUDP;
NTPClient ntp(ntpUDP, "pool.ntp.org", 0, 10 * 60 * 1000);

DHT dht(DHT_PIN, DHTTYPE);

struct StatusState {
  float temp = NAN;
  float humidity = NAN;
  int power = 0;              // 제어 미구현/미설치 → 0 고정
  bool hasTarget = false;
  float target = 0.0f;
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

// ---------- Time ----------
static uint32_t nowUnix() {
  if (ntp.isTimeSet()) return (uint32_t)ntp.getEpochTime();
  return 0;
}

// ---------- NVS ----------
static void loadTargetFromNVS() {
  prefs.begin("homebrew", true);
  gStatus.hasTarget = prefs.getBool("has_target", false);
  gStatus.target    = prefs.getFloat("target", 0.0f);
  prefs.end();

#if LOG_CMD
  Serial.print("[NVS] load target: hasTarget=");
  Serial.print(gStatus.hasTarget ? "true" : "false");
  Serial.print(" target=");
  Serial.println(gStatus.target, 2);
#endif
}

static void saveTargetToNVS(bool hasTarget, float target) {
  prefs.begin("homebrew", false);
  prefs.putBool("has_target", hasTarget);
  prefs.putFloat("target", target);
  prefs.end();

#if LOG_CMD
  Serial.print("[NVS] save target: hasTarget=");
  Serial.print(hasTarget ? "true" : "false");
  Serial.print(" target=");
  Serial.println(target, 2);
#endif
}

// ---------- WiFi ----------
static void wifiConnectNonBlocking() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - wifiLastAttemptMs < 3000) return;
  wifiLastAttemptMs = now;

#if LOG_WIFI
  Serial.print("[WIFI] connecting to ");
  Serial.println(WIFI_SSID);
#endif

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ---------- JSON ----------
static String buildStatusJson(bool includeExtras) {
  StaticJsonDocument<256> doc;

  // temp/humidity: 소수점 1자리
  if (isfinite(gStatus.temp)) {
    doc["temp"] = (float)(roundf(gStatus.temp * 10.0f) / 10.0f);
  } else {
    doc["temp"] = nullptr;
  }

  if (isfinite(gStatus.humidity)) {
    doc["humidity"] = (float)(roundf(gStatus.humidity * 10.0f) / 10.0f);
  } else {
    doc["humidity"] = nullptr;
  }

  doc["power"] = 0;

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
  StaticJsonDocument<128> doc;
  doc["status"] = ok ? "ok" : "error";
  if (!ok) doc["error"] = errCodeOrNull;
  doc["uptime"] = gStatus.uptimeSec;

  String out;
  serializeJson(doc, out);
  return out;
}

// ---------- HTTP ----------
static void setupHttpRoutes() {
  http.on("/status", HTTP_GET, []() {
#if LOG_HTTP
    Serial.println("[HTTP] GET /status");
#endif
    http.send(200, "application/json", buildStatusJson(true));
  });

  http.on("/health", HTTP_GET, []() {
#if LOG_HTTP
    Serial.println("[HTTP] GET /health");
#endif
    bool sensorOk = isfinite(gStatus.temp) && isfinite(gStatus.humidity);
    if (sensorOk) {
      http.send(200, "application/json", buildHealthJson(true, nullptr));
    } else {
      http.send(503, "application/json", buildHealthJson(false, "sensor_failure"));
    }
  });

  http.onNotFound([]() {
#if LOG_HTTP
    Serial.print("[HTTP] 404 ");
    Serial.println(http.uri());
#endif
    http.send(404, "text/plain", "Not Found");
  });
}

// ---------- MQTT ----------
static unsigned long mqttBackoffMs(uint32_t attempt) {
  // 1:1s, 2:2s, 3:4s, 4:8s, 5+:60s
  if (attempt <= 1) return 1000;
  if (attempt == 2) return 2000;
  if (attempt == 3) return 4000;
  if (attempt == 4) return 8000;
  return 60000;
}
static void publishAck(const char* id, const char* cmd, bool success, const char* errorOrNull) {
  StaticJsonDocument<256> doc;
  doc["id"] = id;
  doc["cmd"] = cmd;
  doc["success"] = success;
  doc["error"] = success ? nullptr : errorOrNull;
  doc["ts"] = nowUnix();

  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));

#if LOG_CMD
  Serial.print("[MQTT] ACK -> ");
  Serial.print(TOPIC_ACK);
  Serial.print(" payload=");
  Serial.println(buf);
#endif

  mqtt.publish(TOPIC_ACK, (const uint8_t*)buf, (unsigned int)n, false);
}

static void handleCommandMessage(const char* payload, size_t len) {
#if LOG_CMD
  Serial.print("[MQTT] CMD payload=");
  for (size_t i = 0; i < len; i++) Serial.print(payload[i]);
  Serial.println();
#endif

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, payload, len)) {
#if LOG_CMD
    Serial.println("[MQTT] CMD JSON parse failed");
#endif
    return;
  }

  const char* cmd = doc["cmd"] | "";
  const char* id  = doc["id"]  | "";

  if (strlen(cmd) == 0 || strlen(id) == 0) {
#if LOG_CMD
    Serial.println("[MQTT] CMD missing cmd/id");
#endif
    return;
  }

#if LOG_CMD
  Serial.print("[MQTT] CMD received cmd=");
  Serial.print(cmd);
  Serial.print(" id=");
  Serial.println(id);
#endif

  // ---- set_target ----
  if (strcmp(cmd, "set_target") == 0) {
    // value: float(2~30) or null
    if (doc["value"].isNull()) {
#if LOG_CMD
      Serial.println("[CMD] set_target value=null -> disable control");
#endif
      gStatus.hasTarget = false;
      gStatus.target = 0.0f;
      saveTargetToNVS(false, 0.0f);
      publishAck(id, cmd, true, nullptr);
      return;
    }

    if (!doc["value"].is<float>() && !doc["value"].is<double>() && !doc["value"].is<int>()) {
#if LOG_CMD
      Serial.println("[CMD] set_target invalid type");
#endif
      publishAck(id, cmd, false, "invalid_value");
      return;
    }

    float v = doc["value"].as<float>();
    if (v < TARGET_MIN || v > TARGET_MAX) {
#if LOG_CMD
      Serial.print("[CMD] set_target out of range: ");
      Serial.println(v, 2);
#endif
      publishAck(id, cmd, false, "invalid_value");
      return;
    }

    gStatus.hasTarget = true;
    gStatus.target = v;
    saveTargetToNVS(true, v);

#if LOG_CMD
    Serial.print("[CMD] set_target applied: ");
    Serial.println(v, 2);
#endif

    publishAck(id, cmd, true, nullptr);
    return;
  }

  // ---- restart ----
  if (strcmp(cmd, "restart") == 0) {
#if LOG_CMD
    Serial.println("[CMD] restart requested");
#endif
    publishAck(id, cmd, true, nullptr);
    delay(200);
    ESP.restart();
    return;
  }

#if LOG_CMD
  Serial.print("[CMD] unknown cmd: ");
  Serial.println(cmd);
#endif
  publishAck(id, cmd, false, "invalid_cmd");
}

static void mqttCallback(char* topic, byte* payload, unsigned int length) {
#if LOG_MQTT
  Serial.print("[MQTT] message on topic=");
  Serial.print(topic);
  Serial.print(" length=");
  Serial.println(length);
#endif

  if (strcmp(topic, TOPIC_CMD) != 0) return;
  handleCommandMessage((const char*)payload, length);
}

static void mqttSetup() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
}

static bool mqttConnectNonBlocking() {
  if (mqtt.connected()) return true;
  if (WiFi.status() != WL_CONNECTED) return false;

  unsigned long now = millis();
  unsigned long waitMs = mqttBackoffMs(mqttRetryCount == 0 ? 1 : mqttRetryCount);
  if (now - mqttLastAttemptMs < waitMs) return false;
  mqttLastAttemptMs = now;

#if LOG_MQTT
  Serial.print("[MQTT] connecting to ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print(" attempt=");
  Serial.println(mqttRetryCount + 1);
#endif

  // LWT payload (retain=true)
  StaticJsonDocument<128> willDoc;
  willDoc["temp"] = nullptr;
  willDoc["humidity"] = nullptr;
  willDoc["power"] = 0;
  willDoc["target"] = nullptr;
  willDoc["ts"] = 0;

  char willBuf[128];
  serializeJson(willDoc, willBuf, sizeof(willBuf));

  bool ok = mqtt.connect(
    MQTT_CLIENT_ID,
    MQTT_USER,
    MQTT_PASS,
    TOPIC_STATUS,
    1,     // will qos
    true,  // will retain
    willBuf,
    false  // clean session
  );

  if (ok) {
#if LOG_MQTT
    Serial.println("[MQTT] connected OK");
#endif
    mqttRetryCount = 0;

    mqtt.subscribe(TOPIC_CMD, 1);
#if LOG_MQTT
    Serial.print("[MQTT] subscribed: ");
    Serial.println(TOPIC_CMD);
#endif

    // 연결 복구 시: status 즉시 발행
    lastStatusPublishMs = 0;
    return true;
  } else {
#if LOG_MQTT
    Serial.print("[MQTT] connect failed, state=");
    Serial.println(mqtt.state());
#endif
    mqttRetryCount++;
    return false;
  }
}

// ---------- Sensors ----------
static void readSensorsDHT21() {
  float h = dht.readHumidity();
  float t = dht.readTemperature(); // Celsius

  if (isnan(t) || isnan(h)) {
    gStatus.temp = NAN;
    gStatus.humidity = NAN;

#if LOG_SENSOR
    Serial.println("[SENSOR] DHT read failed (NaN)");
#endif
    return;
  }

  gStatus.temp = t;
  gStatus.humidity = h;

#if LOG_SENSOR
  Serial.print("[SENSOR] temp=");
  Serial.print(gStatus.temp, 1);
  Serial.print("C hum=");
  Serial.print(gStatus.humidity, 1);
  Serial.println("%");
#endif
}

// ---------- Status publish ----------
static void updateRuntimeFields() {
  gStatus.uptimeSec = millis() / 1000;
  gStatus.wifiRssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  gStatus.mqttConnected = mqtt.connected();
  gStatus.ts = nowUnix();
}

static bool shouldPublishStatus() {
  unsigned long now = millis();

  // 주기 발행
  if (now - lastStatusPublishMs >= (unsigned long)REPORT_INTERVAL_SEC * 1000UL) return true;

  // 온도 급변
  if (isfinite(gStatus.temp) && isfinite(lastPublishedTemp)) {
    if (fabsf(gStatus.temp - lastPublishedTemp) >= TEMP_RAPID_DELTA) return true;
  }

  // 첫 발행
  if (!isfinite(lastPublishedTemp) && isfinite(gStatus.temp)) return true;

  return false;
}

static void publishStatus() {
  String body = buildStatusJson(false);

#if LOG_STATUS
  Serial.print("[MQTT] STATUS -> ");
  Serial.print(TOPIC_STATUS);
  Serial.print(" payload=");
  Serial.println(body);
#endif

  mqtt.publish(TOPIC_STATUS, body.c_str(), false);

  lastStatusPublishMs = millis();
  if (isfinite(gStatus.temp)) lastPublishedTemp = gStatus.temp;
}

// ---------- Setup/Loop ----------
void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("==================================");
  Serial.println(" Homebrew MCU Protocol v1.0");
  Serial.println(" DHT21 + MQTT + HTTP");
  Serial.println("==================================");

  loadTargetFromNVS();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  setupHttpRoutes();
  http.begin();

  dht.begin();
  ntp.begin();

  mqttSetup();
}

void loop() {
  // WiFi
  wifiConnectNonBlocking();

  // HTTP
  http.handleClient();

  // NTP
  bool wifiNow = (WiFi.status() == WL_CONNECTED);
  if (wifiNow) ntp.update();

  // MQTT
  mqttConnectNonBlocking();
  mqtt.loop();

  // ---- 1초마다 스캔 ----
  static unsigned long lastScanMs = 0;
  unsigned long now = millis();
  if (now - lastScanMs >= 1000) {
    lastScanMs = now;

    // WiFi 연결 상태 변화 로그
    static bool wifiWasConnected = false;
    if (wifiNow && !wifiWasConnected) {
#if LOG_WIFI
      Serial.print("[WIFI] connected! IP=");
      Serial.println(WiFi.localIP());
#endif
    }
    if (!wifiNow && wifiWasConnected) {
#if LOG_WIFI
      Serial.println("[WIFI] disconnected");
#endif
    }
    wifiWasConnected = wifiNow;

    // 센서 읽기
    readSensorsDHT21();

    // 제어 미구현 -> power 0 고정
    gStatus.power = 0;

    // 상태 필드 갱신
    updateRuntimeFields();

    // status 발행 (60초 or 급변)
    if (mqtt.connected() && shouldPublishStatus()) {
      publishStatus();
    }
  }

  delay(10);
}
