const root = document.getElementById("root");
const label = document.getElementById("label");
const content = document.getElementById("content");

function render(state) {
  root.classList.toggle("active", state.status === "active");

  if (state.status === "error") {
    label.textContent = "Error";
    content.innerHTML = `<div class="error">${state.error || "Something went wrong"}</div>`;
    return;
  }

  if (state.status === "active") {
    label.textContent = "Registered";
    content.innerHTML = `
      <div class="code" style="font-size: 32px;">${state.deviceName || "This device"}</div>
      <div class="hint">Connected. Waiting for content to be scheduled.</div>
    `;
    return;
  }

  if (state.status === "suspended") {
    label.textContent = "Suspended";
    content.innerHTML = `
      <div class="code" style="font-size: 32px;">${state.deviceName || "This device"}</div>
      <div class="hint">This screen has been suspended by an administrator.</div>
    `;
    return;
  }

  // pending
  label.textContent = "Enter this code to add this screen";
  content.innerHTML = `
    ${state.qrDataUrl ? `<img class="qr" src="${state.qrDataUrl}" width="240" height="240" />` : ""}
    <div class="code">${state.registrationCode || "------"}</div>
    <div class="hint">Open the Devices page and enter this code to claim this screen.</div>
  `;
}

window.player.onUpdate(render);
window.player.getState().then(render);
