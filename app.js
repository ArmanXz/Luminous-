// app.js - Kode JavaScript Dashboard dengan integrasi MQTT, realtime slider update, dan PWA

// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => {
      console.log('Service Worker terdaftar dengan scope:', reg.scope);
    })
    .catch(err => {
      console.error('Pendaftaran Service Worker gagal:', err);
    });
}

// URL ikon untuk Plantify dan Leaf
const plantIconLight = "https://img.icons8.com/external-global-made-by-made/100/1A1A1A/external-Light-ui-and-ux-global-made-by-made-2.png";
const plantIconDark  = "https://img.icons8.com/external-global-made-by-made/100/FFFFFF/external-Light-ui-and-ux-global-made-by-made-2.png";
const leafIconLight  = "https://img.icons8.com/external-outline-icons-maxicons/100/external-light-christmas-outline-outline-icons-maxicons.png";
const leafIconDark   = "https://img.icons8.com/external-outline-icons-maxicons/100/FFFFFF/external-light-christmas-outline-outline-icons-maxicons.png";

// URL ikon menu untuk tema light dan dark
const manualIconLight = "https://img.icons8.com/ios-filled/20/000000/control-panel.png";
const automationIconLight = "https://img.icons8.com/ios-filled/20/000000/alarm-clock.png";
const manualIconDark = "https://img.icons8.com/ios-filled/20/ffffff/control-panel.png";
const automationIconDark = "https://img.icons8.com/ios-filled/20/ffffff/alarm-clock.png";

// Konfigurasi broker MQTT via WebSocket
const brokerUrl = "ws://broker.emqx.io:8083/mqtt";
const options = {
  clientId: "webClient_" + Math.random().toString(16).substr(2, 8),
  keepalive: 60,
  clean: true,
};
const client = mqtt.connect(brokerUrl, options);

client.on("connect", () => {
  console.log("Connected to MQTT broker.");
  document.getElementById("statusText").innerText = "Online";
  document.getElementById("connectionLed").classList.remove("offline");
  document.getElementById("connectionLed").classList.add("online");
  client.subscribe("esp32/humidity");
  client.subscribe("esp32/temperature");
  // Subscribe untuk mendapatkan update realtime status relay
  client.subscribe("esp32/relayStatus");
});
client.on("error", (err) => {
  console.error("MQTT Error:", err);
  document.getElementById("statusText").innerText = "Offline";
  document.getElementById("connectionLed").classList.remove("online");
  document.getElementById("connectionLed").classList.add("offline");
});
client.on("message", (topic, message) => {
  let msg = message.toString();
  console.log(`Received [${topic}]: ${msg}`);
  
  if (topic === "esp32/humidity") {
    document.getElementById("humidValue").innerText = msg + " %";
    if (parseFloat(msg) < 30) showToast("Warning: Humidity too low!");
  }
  if (topic === "esp32/temperature") {
    document.getElementById("tempValue").innerText = msg + " °C";
    if (parseFloat(msg) > 30) showToast("Warning: Temperature too high!");
  }
  // Update status relay secara realtime
  if (topic === "esp32/relayStatus") {
    // Format pesan contoh: "relay2 true"
    let parts = msg.split(" ");
    if (parts.length >= 2) {
      let relayNum = parseInt(parts[0].replace("relay", ""));
      let state = parts[1].toLowerCase();
      let checkbox = document.getElementById("relay" + relayNum + "-switch");
      if (checkbox) {
        checkbox.checked = (state === "true");
      }
      let imgElement = document.getElementById("relay" + relayNum + "-img");
      if (imgElement) {
        imgElement.src = (state === "true")
          ? "https://img.icons8.com/color/48/000000/light-on.png"
          : "https://img.icons8.com/color/48/000000/light-off.png";
      }
    }
  }
});
function sendCommand(cmd) {
  client.publish("esp32/command", cmd);
  console.log("Sent:", cmd);
}
function toggleRelay(relayNumber, isChecked) {
  // Format perintah relay: "relayX true/false"
  let state = isChecked ? "true" : "false";
  let cmd = "relay" + relayNumber + " " + state;
  sendCommand(cmd);
  // Update UI nanti juga akan didapat dari topik relayStatus
}
function sendTimerOn() {
  let relay = document.getElementById("timerOnRelay").value;
  let duration = document.getElementById("timerOnDuration").value;
  if (!duration || isNaN(duration)) {
    showToast("Masukkan durasi yang valid!");
    return;
  }
  let cmd = "timer_on relay" + relay + " " + duration;
  sendCommand(cmd);
}
function sendTimerOff() {
  let relay = document.getElementById("timerOffRelay").value;
  let duration = document.getElementById("timerOffDuration").value;
  if (!duration || isNaN(duration)) {
    showToast("Masukkan durasi yang valid!");
    return;
  }
  let cmd = "timer_off relay" + relay + " " + duration;
  sendCommand(cmd);
}
function sendSchedule() {
  const relay = document.getElementById("scheduleRelay").value;
  const action = document.getElementById("scheduleAction").value;
  const timeValue = document.getElementById("scheduleTime").value;
  const repeatType = document.getElementById("repeatType").value;
  
  if (!timeValue) {
    showToast("Pilih waktu dengan format yang benar!");
    return;
  }
  
  // Pastikan input waktu dalam format HH:MM:SS (jika hanya HH:MM, tambahkan ":00")
  let timeStr = timeValue;
  if (timeValue.split(":").length === 2) {
    timeStr += ":00";
  }
  
  // Format perintah: rtc_schedule:<on/off>:<relay>:<HH>:<MM>[:<repeat>]
  let cmd = "rtc_schedule:" + action + ":" + relay + ":" + timeStr.split(":")[0] + ":" + timeStr.split(":")[1];
  if (repeatType !== "none") {
    cmd += ":" + repeatType;
  }
  sendCommand(cmd);
}
function showToast(message) {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.classList.add("show"); }, 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { toastContainer.removeChild(toast); }, 300);
  }, 3000);
}
setInterval(() => {
  let now = new Date();
  document.getElementById("timeText").innerText = now.toLocaleDateString() + " - " + now.toLocaleTimeString();
  let hr = now.getHours();
  let greeting = hr < 12 ? "Good Morning!" : (hr < 17 ? "Good Afternoon!" : "Good Evening!");
  document.getElementById("greetingText").innerText = greeting;
}, 1000);
document.addEventListener("DOMContentLoaded", () => {
  const navManual = document.getElementById("navManual");
  const navAutomation = document.getElementById("navAutomation");
  const manualSection = document.getElementById("manualSection");
  const automationSection = document.getElementById("automationSection");
  
  function resetNav() {
    navManual.classList.remove("active");
    navAutomation.classList.remove("active");
  }
  navManual.addEventListener("click", () => {
    resetNav();
    navManual.classList.add("active");
    manualSection.style.display = "block";
    automationSection.style.display = "none";
  });
  navAutomation.addEventListener("click", () => {
    resetNav();
    navAutomation.classList.add("active");
    automationSection.style.display = "block";
    manualSection.style.display = "none";
  });
  
  const repeatSelect = document.getElementById("repeatType");
  const weeklyOptions = document.getElementById("weeklyOptions");
  repeatSelect.addEventListener("change", () => {
    weeklyOptions.style.display = (repeatSelect.value === "weekly") ? "flex" : "none";
  });
  
  const themeToggle = document.getElementById("themeToggle");
  const plantIcon = document.getElementById("plantIcon");
  const leafIcon  = document.getElementById("leafIcon");
  const manualIcon = document.getElementById("manualIcon");
  const automationIcon = document.getElementById("automationIcon");
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    if (document.body.classList.contains("dark-theme")) {
      themeToggle.innerText = "Light Theme";
      if (plantIcon) plantIcon.src = plantIconDark;
      if (leafIcon) leafIcon.src = leafIconDark;
      if (manualIcon) manualIcon.src = manualIconDark;
      if (automationIcon) automationIcon.src = automationIconDark;
    } else {
      themeToggle.innerText = "Dark Theme";
      if (plantIcon) plantIcon.src = plantIconLight;
      if (leafIcon) leafIcon.src = leafIconLight;
      if (manualIcon) manualIcon.src = manualIconLight;
      if (automationIcon) automationIcon.src = automationIconLight;
    }
  });
});