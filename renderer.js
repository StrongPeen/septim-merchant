(() => {
  const historyKey = "septim-merchant-calculator-history";
  const deletedHistoryKey = "septim-merchant-deleted-history";
  const themeKey = "merchant-assistant-theme";
  const themeNames = ["daedric", "altmer", "argonian", "bosmer", "breton", "dunmer", "dagoth", "giggles", "imperial", "khajiit", "nord", "orc", "redguard", "goblin"];
  const categories = ["All Wares", "Weapons", "Armor & Apparel", "Potions", "Poisons", "Food", "Ingredients", "Books & Scrolls", "Soul Gems", "Materials", "Jewelry", "Miscellaneous"];
  const categoryRules = [
    ["Weapons", ["sword", "greatsword", "dagger", "axe", "battleaxe", "mace", "warhammer", "bow", "crossbow", "staff", "weapon"]],
    ["Potions", ["potion", "elixir", "draught", "tonic"]],
    ["Poisons", ["poison", "venom"]],
    ["Armor & Apparel", ["armor", "armour", "helmet", "helm", "cuirass", "boots", "boot", "gauntlet", "glove", "shield", "hood", "cloak", "robe", "clothes", "apparel", "outfit"]],
    ["Food", ["food", "bread", "meat", "cheese", "cabbage", "apple", "stew", "wine", "ale", "mead", "drink", "salmon", "roast", "sweetroll"]],
    ["Ingredients", ["ingredient", "herb", "flower", "root", "mushroom", "wheat", "garlic", "lavender", "salt pile", "nightshade"]],
    ["Books & Scrolls", ["book", "tome", "scroll", "spell", "recipe", "note", "journal", "letter"]],
    ["Soul Gems", ["soul gem", "black soul", "grand soul", "greater soul", "common soul", "lesser soul", "petty soul"]],
    ["Materials", ["ingot", "ore", "leather", "hide", "pelt", "linen", "firewood", "dragon bone", "dragon scale", "material"]],
    ["Jewelry", ["ring", "necklace", "amulet", "circlet", "jewel", "diamond", "ruby", "sapphire", "emerald", "garnet", "pearl"]]
  ];
  const $ = (selector) => document.querySelector(selector);
  const form = $("#calculator-form");
  const itemName = $("#item-name");
  const basePrice = $("#base-price");
  const quantity = $("#quantity");
  const markup = $("#markup");
  const resultCard = $("#result-card");
  const status = $("#form-status");
  let history = loadHistory();
  let deletedHistory = loadDeletedHistory();
  let latestCalculation = null;
  let activeLedgerCategory = "All Wares";
  let selectedLedgerIndexes = new Set();
  let selectedLedgerQuantities = new Map();
  let ledgerSearchTerm = "";

  function applyTheme(theme) {
    const selected = themeNames.includes(theme) ? theme : "daedric";
    document.body.classList.remove(...themeNames.map((name) => `theme-${name}`));
    document.body.classList.add(`theme-${selected}`);
    $("#theme-select").value = selected;
    localStorage.setItem(themeKey, selected);
  }

  function classifyItem(name) {
    const normalized = String(name || "").toLowerCase().replace(/[’']/g, "");
    return categoryRules.find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] || "Miscellaneous";
  }

  function categoryEntries(category) {
    const categoryMatches = category === "All Wares" ? history : history.filter((entry) => (entry.category || classifyItem(entry.itemName)) === category);
    const query = ledgerSearchTerm.trim().toLowerCase();
    return query ? categoryMatches.filter((entry) => `${entry.itemName} ${entry.category}`.toLowerCase().includes(query)) : categoryMatches;
  }

  function loadHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
      return Array.isArray(stored) ? stored.map((entry) => ({ ...entry, category: entry.category || classifyItem(entry.itemName) })) : [];
    } catch {
      return [];
    }
  }

  function loadDeletedHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(deletedHistoryKey) || "[]");
      return Array.isArray(stored) ? stored.map((entry) => ({ ...entry, category: entry.category || classifyItem(entry.itemName) })).slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(historyKey, JSON.stringify(history));
  }

  function saveDeletedHistory() {
    localStorage.setItem(deletedHistoryKey, JSON.stringify(deletedHistory.slice(0, 5)));
  }

  function backupData() {
    return { app: "Merchant's Assistant", exportedAt: new Date().toISOString(), calculations: history, recentlyDeleted: deletedHistory, preferences: { theme: localStorage.getItem(themeKey) || "daedric", openWithSkyrim: localStorage.getItem("merchant-assistant-open-with-skyrim") === "true" } };
  }

  function downloadText(filename, content, type) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function spreadsheetCsv() {
    const columns = ["Item", "Category", "Price per item", "Quantity", "Markup percent", "Base value", "Markup added", "Total asking price", "Date"];
    const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    return [columns, ...history.map((entry) => [entry.itemName, entry.category, entry.price, entry.quantity, entry.markup, entry.baseValue, entry.markupValue, entry.total, new Date(entry.createdAt).toLocaleString()])].map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  function updateRestoreControl() {
    const button = $("#restore-deleted");
    const select = $("#restore-count");
    button.disabled = !deletedHistory.length;
    [...select.options].forEach((option) => { option.disabled = Number(option.value) > deletedHistory.length; });
    if (Number(select.value) > deletedHistory.length) select.value = String(Math.max(1, deletedHistory.length));
  }

  function formatSeptims(value) {
    return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} ₷`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
  }

  function renderHistory() {
    const list = $("#history-list");
    if (!history.length) {
      list.innerHTML = '<div class="history-empty">No calculations yet. Your trade history will appear here.</div>';
      updateRestoreControl();
      return;
    }
    list.innerHTML = history.slice(0, 4).map((entry, index) => `<button class="history-entry" type="button" data-history-index="${index}">
      <span class="history-name">${escapeHtml(entry.itemName || "Unnamed item")}</span>
      <strong class="history-total">${formatSeptims(entry.total)}</strong>
      <span class="history-details">${escapeHtml(entry.category)} · ${entry.quantity} × ${formatSeptims(entry.price)} · ${entry.markup}% markup</span>
      <span class="history-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
    </button>`).join("");
    list.querySelectorAll("[data-history-index]").forEach((button) => {
      button.addEventListener("click", () => restoreCalculation(history[Number(button.dataset.historyIndex)]));
    });
    updateRestoreControl();
  }

  function deleteHistoryEntry(index) {
    const entry = history[index];
    if (!entry || !window.confirm(`Delete “${entry.itemName || "this item"}” from the pricing ledger?`)) return;
    history.splice(index, 1);
    deletedHistory = [entry, ...deletedHistory].slice(0, 5);
    selectedLedgerIndexes.clear();
    selectedLedgerQuantities.clear();
    saveHistory();
    saveDeletedHistory();
    renderHistory();
    renderLedgerTabs();
    renderLedgerPage();
    status.textContent = "Item removed from your pricing ledger.";
  }

  function restoreDeleted() {
    const amount = Math.min(Number($("#restore-count").value), deletedHistory.length);
    if (!amount) return;
    const restored = deletedHistory.splice(0, amount);
    history = [...restored, ...history];
    saveHistory();
    saveDeletedHistory();
    renderHistory();
    renderLedgerTabs();
    renderLedgerPage();
    status.textContent = `${amount} deleted ${amount === 1 ? "entry" : "entries"} restored.`;
  }

  function restoreCalculation(entry) {
    itemName.value = entry.itemName || "";
    basePrice.value = entry.price;
    quantity.value = entry.quantity;
    markup.value = String(entry.markup);
    showResult(entry);
    closeLedger();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLedgerTabs() {
    const tabs = $("#ledger-tabs");
    tabs.innerHTML = categories.map((category) => `<button class="ledger-tab ${category === activeLedgerCategory ? "active" : ""}" type="button" data-ledger-category="${escapeHtml(category)}"><span>${escapeHtml(category)}</span><strong>${categoryEntries(category).length}</strong></button>`).join("");
    tabs.querySelectorAll("[data-ledger-category]").forEach((button) => button.addEventListener("click", () => {
      activeLedgerCategory = button.dataset.ledgerCategory;
      renderLedgerTabs();
      renderLedgerPage();
    }));
  }

  function renderLedgerPage() {
    const entries = categoryEntries(activeLedgerCategory);
    const title = activeLedgerCategory === "All Wares" ? "Every item" : activeLedgerCategory;
    $("#ledger-category-kicker").textContent = activeLedgerCategory === "All Wares" ? "All recorded wares" : "Skyrim inventory category";
    $("#ledger-category-title").textContent = title;
    $("#ledger-count").textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
    $("#ledger-list").innerHTML = entries.length ? entries.map((entry) => {
      const index = history.indexOf(entry);
      const quantity = selectedLedgerQuantities.get(index) || entry.quantity || 1;
      const categorySelect = categories.slice(1).map((category) => `<option value="${escapeHtml(category)}" ${category === entry.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("");
      return `<div class="ledger-entry ${selectedLedgerIndexes.has(index) ? "selected" : ""}"><label class="ledger-check"><input type="checkbox" data-ledger-select="${index}" ${selectedLedgerIndexes.has(index) ? "checked" : ""} /><span></span></label><div class="ledger-entry-copy"><strong class="ledger-entry-name">${escapeHtml(entry.itemName || "Unnamed item")}</strong><small>${entry.quantity} × ${formatSeptims(entry.price)} · ${entry.markup}% markup · ${new Date(entry.createdAt).toLocaleDateString()}</small></div><strong class="ledger-entry-price">${formatSeptims(entry.total)}</strong><select class="ledger-category-select" data-ledger-category-edit="${index}" aria-label="Category for ${escapeHtml(entry.itemName || "item")}">${categorySelect}</select>${selectedLedgerIndexes.has(index) ? `<label class="ledger-quantity">Qty <input type="number" min="1" step="1" value="${quantity}" data-ledger-quantity="${index}" /></label>` : ""}<button class="ledger-load" type="button" data-ledger-index="${index}">Load</button><button class="ledger-delete" type="button" data-ledger-delete="${index}">Delete</button></div>`;
    }).join("") : `<div class="ledger-empty"><span>ᚠ</span><p>No prices recorded in this section yet.</p><small>Name an item with a recognizable Skyrim trade word and it will be shelved here automatically.</small></div>`;
    $("#ledger-list").querySelectorAll("[data-ledger-select]").forEach((checkbox) => checkbox.addEventListener("change", () => {
      const index = Number(checkbox.dataset.ledgerSelect);
      if (checkbox.checked) { selectedLedgerIndexes.add(index); selectedLedgerQuantities.set(index, history[index]?.quantity || 1); } else { selectedLedgerIndexes.delete(index); selectedLedgerQuantities.delete(index); }
      renderLedgerPage();
      renderLedgerTabs();
    }));
    $("#ledger-list").querySelectorAll("[data-ledger-quantity]").forEach((input) => input.addEventListener("change", () => {
      const index = Number(input.dataset.ledgerQuantity);
      const value = Math.max(1, Math.floor(Number(input.value) || 1));
      selectedLedgerQuantities.set(index, value);
      input.value = value;
      renderSelectionSummary();
    }));
    $("#ledger-list").querySelectorAll("[data-ledger-category-edit]").forEach((select) => select.addEventListener("change", () => {
      const entry = history[Number(select.dataset.ledgerCategoryEdit)];
      if (!entry) return;
      entry.category = select.value;
      saveHistory();
      renderHistory();
      renderLedgerTabs();
      renderLedgerPage();
      status.textContent = `${entry.itemName || "Item"} moved to ${entry.category}.`;
    }));
    $("#ledger-list").querySelectorAll("[data-ledger-index]").forEach((button) => button.addEventListener("click", () => restoreCalculation(history[Number(button.dataset.ledgerIndex)])));
    $("#ledger-list").querySelectorAll("[data-ledger-delete]").forEach((button) => button.addEventListener("click", () => deleteHistoryEntry(Number(button.dataset.ledgerDelete))));
    renderSelectionSummary();
  }

  function renderSelectionSummary() {
    const selected = [...selectedLedgerIndexes].map((index) => ({ index, entry: history[index] })).filter(({ entry }) => Boolean(entry));
    const upsell = Number($("#bulk-markup").value || 0);
    const multiplier = 1 + (upsell / 100);
    const total = selected.reduce((sum, { index, entry }) => sum + ((Number(entry.total) / Math.max(1, Number(entry.quantity) || 1)) * (selectedLedgerQuantities.get(index) || entry.quantity || 1) * multiplier), 0);
    const units = selected.reduce((sum, { index, entry }) => sum + (selectedLedgerQuantities.get(index) || entry.quantity || 1), 0);
    $("#selected-count").textContent = `${selected.length} ${selected.length === 1 ? "item" : "items"} · ${units} total units`;
    $("#selected-total").textContent = formatSeptims(total);
    $("#selected-breakdown").innerHTML = selected.length ? selected.map(({ index, entry }) => { const quantity = selectedLedgerQuantities.get(index) || entry.quantity || 1; const itemTotal = (Number(entry.total) / Math.max(1, Number(entry.quantity) || 1)) * quantity * multiplier; return `<div><span>${quantity} × ${escapeHtml(entry.itemName || "Unnamed item")}</span><strong>${formatSeptims(itemTotal)}</strong></div>`; }).join("") : "<p>Select two or more entries to price a bundle.</p>";
  }

  function openLedger() {
    activeLedgerCategory = "All Wares";
    ledgerSearchTerm = "";
    $("#ledger-search").value = "";
    renderLedgerTabs();
    renderLedgerPage();
    $("#ledger-overlay").hidden = false;
    $("#ledger-overlay").setAttribute("aria-hidden", "false");
  }

  function closeLedger() {
    $("#ledger-overlay").hidden = true;
    $("#ledger-overlay").setAttribute("aria-hidden", "true");
  }

  function openOptions() {
    $("#options-overlay").hidden = false;
    $("#options-overlay").setAttribute("aria-hidden", "false");
  }

  function closeOptions() {
    $("#options-overlay").hidden = true;
    $("#options-overlay").setAttribute("aria-hidden", "true");
  }

  function showResult(calculation) {
    latestCalculation = calculation;
    $("#result-markup").textContent = calculation.markup ? `${calculation.markup}% on top` : "Base price";
    $("#result-total").textContent = formatSeptims(calculation.total);
    $("#result-base").textContent = formatSeptims(calculation.baseValue);
    $("#result-added").textContent = formatSeptims(calculation.markupValue);
    $("#result-per-item").textContent = formatSeptims(calculation.total / calculation.quantity);
    resultCard.hidden = false;
  }

  function calculate(event) {
    event.preventDefault();
    const price = Number(basePrice.value);
    const count = Math.floor(Number(quantity.value));
    const percentage = Number(markup.value);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(count) || count < 1) {
      status.textContent = "Enter a valid price and quantity first.";
      resultCard.hidden = true;
      return;
    }
    const baseValue = price * count;
    const markupValue = baseValue * (percentage / 100);
    const calculation = {
      itemName: itemName.value.trim() || "Unnamed item",
      price,
      quantity: count,
      markup: percentage,
      baseValue,
      markupValue,
      total: baseValue + markupValue,
      category: classifyItem(itemName.value),
      createdAt: Date.now()
    };
    history = [calculation, ...history.filter((entry) => !(entry.itemName === calculation.itemName && entry.price === calculation.price && entry.quantity === calculation.quantity && entry.markup === calculation.markup))];
    saveHistory();
    renderHistory();
    renderLedgerTabs();
    if (!$("#ledger-overlay").hidden) renderLedgerPage();
    showResult(calculation);
    status.textContent = "Saved to your trade ledger.";
  }

  form.addEventListener("submit", calculate);
  $("#clear-history").addEventListener("click", () => {
    if (!history.length) return;
    history = [];
    selectedLedgerIndexes.clear();
    selectedLedgerQuantities.clear();
    saveHistory();
    renderHistory();
    renderLedgerTabs();
    renderLedgerPage();
    status.textContent = "Trade history cleared.";
  });
  $("#restore-deleted").addEventListener("click", restoreDeleted);
  $("#copy-button").addEventListener("click", async () => {
    if (!latestCalculation) return;
    const text = `${latestCalculation.itemName}: ${formatSeptims(latestCalculation.total)} (${latestCalculation.markup}% markup)`;
    try {
      await navigator.clipboard.writeText(text);
      $("#copy-button").textContent = "Copied to clipboard";
      setTimeout(() => { $("#copy-button").textContent = "Copy asking price"; }, 1400);
    } catch {
      status.textContent = "Could not copy to the clipboard.";
    }
  });
  const setQuantity = (value) => { quantity.value = Math.max(1, Math.floor(Number(value) || 1)); };
  $("#decrease-quantity").addEventListener("click", () => setQuantity(Number(quantity.value) - 1));
  $("#increase-quantity").addEventListener("click", () => setQuantity(Number(quantity.value) + 1));
  $("#always-on-top").addEventListener("click", async (event) => {
    const active = await window.merchantWindow.toggleAlwaysOnTop();
    event.currentTarget.classList.toggle("active", active);
    event.currentTarget.setAttribute("aria-pressed", String(active));
    event.currentTarget.title = `Always on top: ${active ? "on" : "off"}`;
  });
  $("#readme-button").addEventListener("click", () => window.merchantWindow.openReadme());
  $("#open-ledger").addEventListener("click", openLedger);
  $("#close-ledger").addEventListener("click", closeLedger);
  $("#open-options").addEventListener("click", openOptions);
  $("#close-options").addEventListener("click", closeOptions);
  $("#theme-select").addEventListener("change", (event) => { applyTheme(event.currentTarget.value); $("#options-status").textContent = "Theme saved."; });
  $("#giggles-button").addEventListener("click", () => {
    const audio = $("#giggles-audio");
    audio.currentTime = 0;
    audio.play().catch(() => { status.textContent = "Giggles' sound could not be played."; });
    $("#giggles-button").classList.add("playing");
    setTimeout(() => $("#giggles-button").classList.remove("playing"), 420);
  });
  $("#open-with-skyrim").checked = localStorage.getItem("merchant-assistant-open-with-skyrim") === "true";
  $("#open-with-skyrim").addEventListener("change", async (event) => {
    const enabled = event.currentTarget.checked;
    localStorage.setItem("merchant-assistant-open-with-skyrim", String(enabled));
    await window.merchantWindow.setSkyrimAutostart(enabled);
    $("#options-status").textContent = enabled ? "Skyrim launch opening enabled." : "Skyrim launch opening disabled.";
  });
  $("#download-backup").addEventListener("click", () => {
    downloadText("Merchants-Assistant-backup.json", JSON.stringify(backupData(), null, 2), "application/json");
    $("#options-status").textContent = "Backup downloaded to your chosen browser download folder.";
  });
  $("#open-spreadsheet").addEventListener("click", async () => {
    const opened = await window.merchantWindow.openSpreadsheet(spreadsheetCsv());
    $("#options-status").textContent = opened ? "Excel-compatible pricing sheet opened." : "Spreadsheet export canceled.";
  });
  $("#bulk-markup").addEventListener("change", renderSelectionSummary);
  $("#ledger-search").addEventListener("input", (event) => { ledgerSearchTerm = event.currentTarget.value; renderLedgerTabs(); renderLedgerPage(); });
  $("#clear-selection").addEventListener("click", () => { selectedLedgerIndexes.clear(); selectedLedgerQuantities.clear(); renderLedgerPage(); renderLedgerTabs(); });
  document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!$("#ledger-overlay").hidden) closeLedger(); if (!$("#options-overlay").hidden) closeOptions(); });

  applyTheme(localStorage.getItem(themeKey) || "daedric");
  renderHistory();
  updateRestoreControl();
})();
