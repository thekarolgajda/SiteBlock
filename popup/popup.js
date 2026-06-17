// Chrome compat: alias the promise-based `browser.*` namespace to `chrome.*`.
// Firefox provides `browser` natively (no-op there); Chrome MV3's `chrome.*`
// APIs already return promises, so this is all the shared code needs.
if (typeof browser === "undefined") globalThis.browser = chrome;

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHost(input) {
  const t = input.trim().toLowerCase();
  try {
    const url = t.includes("://") ? new URL(t) : new URL("https://" + t);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return t.replace(/^www\./, "");
  }
}

function isValidHost(h) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h);
}

function scheduleLabel(schedule) {
  if (!schedule) return "Always";
  const DAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const days = schedule.days.map(d => DAY[d]).join(" ");
  const fmt = t => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "pm" : "am";
    return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${suffix}`;
  };
  return `${days} ${fmt(schedule.startTime)}–${fmt(schedule.endTime)}`;
}

// Migrate old string-array format to object format
function migrateSite(s) {
  return typeof s === "string" ? { host: s, schedule: null } : s;
}

async function getSites() {
  const r = await browser.storage.local.get("blockedSites");
  return (r.blockedSites || []).map(migrateSite);
}

async function saveSites(sites) {
  await browser.storage.local.set({ blockedSites: sites });
}

// ── Schedule widget ───────────────────────────────────────────────────────────

function readDays(container) {
  return [...container.querySelectorAll(".day-btn.active")].map(b => Number(b.dataset.day));
}

function makeDaysWidget(selectedDays = [1, 2, 3, 4, 5]) {
  const labels = [
    { day: 1, label: "Mo" }, { day: 2, label: "Tu" }, { day: 3, label: "We" },
    { day: 4, label: "Th" }, { day: 5, label: "Fr" }, { day: 6, label: "Sa" },
    { day: 0, label: "Su" },
  ];
  const wrap = document.createElement("div");
  wrap.className = "days";
  labels.forEach(({ day, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-btn" + (selectedDays.includes(day) ? " active" : "");
    btn.dataset.day = day;
    btn.textContent = label;
    btn.addEventListener("click", () => btn.classList.toggle("active"));
    wrap.appendChild(btn);
  });
  return wrap;
}

function makeScheduleFields(schedule, idPrefix) {
  // schedule = null means always; object means custom
  const panel = document.createElement("div");
  panel.className = "edit-schedule-panel";

  // "Always" checkbox
  const alwaysRow = document.createElement("div");
  alwaysRow.className = "schedule-always-row";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = `${idPrefix}-always`;
  cb.checked = !schedule;
  const lbl = document.createElement("label");
  lbl.htmlFor = cb.id;
  lbl.appendChild(cb);
  lbl.appendChild(document.createTextNode("Block always (no schedule)"));
  alwaysRow.appendChild(lbl);
  panel.appendChild(alwaysRow);

  // Custom fields
  const customFields = document.createElement("div");
  customFields.style.display = schedule ? "flex" : "none";
  customFields.style.flexDirection = "column";
  customFields.style.gap = "0.5rem";

  const daysRow = document.createElement("div");
  daysRow.className = "days-row";
  const daysLabel = document.createElement("span");
  daysLabel.className = "label";
  daysLabel.textContent = "Days";
  const daysWidget = makeDaysWidget(schedule?.days);
  daysRow.appendChild(daysLabel);
  daysRow.appendChild(daysWidget);

  const timeRow = document.createElement("div");
  timeRow.className = "time-row";
  const fromLabel = document.createElement("span");
  fromLabel.className = "label";
  fromLabel.textContent = "From";
  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = schedule?.startTime || "09:00";
  const toLabel = document.createElement("span");
  toLabel.className = "label to-label";
  toLabel.textContent = "to";
  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = schedule?.endTime || "18:00";
  timeRow.append(fromLabel, startInput, toLabel, endInput);

  customFields.append(daysRow, timeRow);
  panel.appendChild(customFields);

  cb.addEventListener("change", () => {
    customFields.style.display = cb.checked ? "none" : "flex";
  });

  panel.readSchedule = () => {
    if (cb.checked) return null;
    return {
      days: readDays(daysWidget),
      startTime: startInput.value,
      endTime: endInput.value,
    };
  };

  return panel;
}

// ── Add form schedule toggle ──────────────────────────────────────────────────

let addScheduleOpen = false;

document.getElementById("scheduleToggle").addEventListener("click", () => {
  addScheduleOpen = !addScheduleOpen;
  document.getElementById("schedulePanel").classList.toggle("hidden", !addScheduleOpen);
  document.getElementById("scheduleToggleIcon").textContent = addScheduleOpen ? "▾" : "▸";
});

// Day toggle buttons in the static add-form schedule panel
document.querySelectorAll("#addDays .day-btn").forEach(btn => {
  btn.addEventListener("click", () => btn.classList.toggle("active"));
});

function readAddSchedule() {
  if (!addScheduleOpen) return null;
  const days = readDays(document.getElementById("addDays"));
  const start = document.getElementById("addStart").value;
  const end = document.getElementById("addEnd").value;
  return days.length > 0 ? { days, startTime: start, endTime: end } : null;
}

function updateAddToggleSummary(schedule) {
  document.getElementById("scheduleToggleSummary").textContent = scheduleLabel(schedule);
}

document.getElementById("addDays").addEventListener("click", () => {
  updateAddToggleSummary(readAddSchedule());
});
document.getElementById("addStart").addEventListener("change", () => updateAddToggleSummary(readAddSchedule()));
document.getElementById("addEnd").addEventListener("change", () => updateAddToggleSummary(readAddSchedule()));

// ── Add form submit ───────────────────────────────────────────────────────────

document.getElementById("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const errEl = document.getElementById("addError");
  errEl.textContent = "";
  const host = normalizeHost(document.getElementById("siteInput").value);

  if (!isValidHost(host)) {
    errEl.textContent = "Enter a valid domain, e.g. reddit.com";
    return;
  }

  const sites = await getSites();
  if (sites.some(s => s.host === host)) {
    errEl.textContent = `${host} is already blocked`;
    return;
  }

  const schedule = readAddSchedule();
  sites.push({ host, schedule });
  sites.sort((a, b) => a.host.localeCompare(b.host));
  await saveSites(sites);

  document.getElementById("siteInput").value = "";
  // reset schedule panel
  addScheduleOpen = false;
  document.getElementById("schedulePanel").classList.add("hidden");
  document.getElementById("scheduleToggleIcon").textContent = "▸";
  document.getElementById("scheduleToggleSummary").textContent = "Always";
  document.querySelectorAll("#addDays .day-btn").forEach(b => {
    b.classList.toggle("active", [1, 2, 3, 4, 5].includes(Number(b.dataset.day)));
  });

  renderList(sites);
});

// ── List rendering ────────────────────────────────────────────────────────────

let editingIndex = null;

async function renderList(sites) {
  const list = document.getElementById("siteList");
  const empty = document.getElementById("emptyMsg");
  list.innerHTML = "";
  empty.style.display = sites.length === 0 ? "block" : "none";

  sites.forEach((site, i) => {
    const li = document.createElement("li");

    // Normal row
    const row = document.createElement("div");
    row.className = "site-row";

    const hostSpan = document.createElement("span");
    hostSpan.className = "site-host";
    hostSpan.textContent = site.host;

    const schedSpan = document.createElement("span");
    schedSpan.className = "site-schedule";
    schedSpan.textContent = scheduleLabel(site.schedule);

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn edit";
    editBtn.title = "Edit";
    editBtn.textContent = "✎";

    const removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn remove";
    removeBtn.title = "Remove";
    removeBtn.textContent = "✕";

    row.append(hostSpan, schedSpan, editBtn, removeBtn);
    li.appendChild(row);

    // Edit panel (injected below the row when open)
    editBtn.addEventListener("click", () => {
      if (editingIndex === i) {
        closeEditPanel(li, i);
        return;
      }
      // Close any other open panel first
      document.querySelectorAll(".edit-panel").forEach(p => p.remove());
      editingIndex = i;
      editBtn.textContent = "▲";
      openEditPanel(li, site, i);
    });

    removeBtn.addEventListener("click", async () => {
      const updated = await getSites();
      updated.splice(i, 1);
      await saveSites(updated);
      editingIndex = null;
      renderList(updated);
    });

    list.appendChild(li);
  });
}

function closeEditPanel(li, i) {
  const panel = li.querySelector(".edit-panel");
  if (panel) panel.remove();
  const editBtn = li.querySelector(".icon-btn.edit");
  if (editBtn) editBtn.textContent = "✎";
  if (editingIndex === i) editingIndex = null;
}

function openEditPanel(li, site, i) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";

  // Host input
  const hostRow = document.createElement("div");
  hostRow.className = "edit-host-row";
  const hostInput = document.createElement("input");
  hostInput.type = "text";
  hostInput.value = site.host;
  hostRow.appendChild(hostInput);
  panel.appendChild(hostRow);

  // Schedule fields
  const schedFields = makeScheduleFields(site.schedule, `edit-${i}`);
  panel.appendChild(schedFields);

  // Actions
  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.type = "button";
  cancelBtn.addEventListener("click", () => closeEditPanel(li, i));

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-save";
  saveBtn.textContent = "Save";
  saveBtn.type = "button";
  saveBtn.addEventListener("click", async () => {
    const newHost = normalizeHost(hostInput.value);
    if (!isValidHost(newHost)) {
      hostInput.style.borderColor = "#e05555";
      return;
    }
    const sites = await getSites();
    const conflict = sites.findIndex((s, idx) => idx !== i && s.host === newHost);
    if (conflict !== -1) {
      hostInput.style.borderColor = "#e05555";
      return;
    }
    sites[i] = { host: newHost, schedule: schedFields.readSchedule() };
    sites.sort((a, b) => a.host.localeCompare(b.host));
    await saveSites(sites);
    editingIndex = null;
    renderList(sites);
  });

  actions.append(cancelBtn, saveBtn);
  panel.appendChild(actions);
  li.appendChild(panel);
}

// ── Init ──────────────────────────────────────────────────────────────────────

getSites().then(renderList);
