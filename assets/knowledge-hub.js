(() => {
  "use strict";

  const hub = {
    activePanel: "",
    routes: [],
    activeRouteId: "",
    validation: null,
    assets: [],
    assetLibraryId: "",
    activeAssetId: "",
    assetEditorMode: "preview",
    assetEditorLayout: "single",
    savingAssetId: "",
    assetSaveFailedId: "",
    learningAssetId: "",
    selfLearning: [],
    activeSelfId: "",
    trackingTab: "search",
    designs: [],
    activeDesignId: "",
  };

  const panels = {
    routes: document.getElementById("knowledge-routes"),
    validation: document.getElementById("knowledge-validation"),
    production: document.getElementById("knowledge-production"),
    self: document.getElementById("knowledge-self-learning"),
    assets: document.getElementById("knowledge-assets"),
    tracking: document.getElementById("knowledge-tracking"),
    design: document.getElementById("knowledge-tracking-design"),
    library: document.getElementById("library-knowledge-panel"),
  };

  const browser = document.getElementById("knowledge-browser");
  const editor = document.getElementById("knowledge-editor");
  const e = (value) => escapeHtml(String(value ?? ""));
  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
  };
  const statusLabel = (status) => ({ active: "已生效", pending_validation: "待验证", revoked: "已停用", superseded: "已替代", draft: "草稿", reviewing: "评审中", ready: "可冻结", frozen: "已冻结", approved: "已通过", rejected: "需修改" }[status] || status || "-");
  const documentAssetLibraryIds = new Set(["dimension", "udf", "data_source", "performance"]);
  const isDocumentAssetLibrary = () => documentAssetLibraryIds.has(hub.assetLibraryId);
  const ASSET_TITLE_OVERRIDES_KEY = "aidw.knowledgeAssetTitleOverrides";
  const MAX_ASSET_IMPORT_BYTES = 1024 * 1024;
  let selectedAssetImportFile = null;

  function assetTitleOverrides() {
    try { return JSON.parse(localStorage.getItem(ASSET_TITLE_OVERRIDES_KEY) || "{}"); }
    catch (_error) { return {}; }
  }

  function rememberLocalAsset(libraryId, assetId, title) {
    const overrides = assetTitleOverrides();
    overrides[`${libraryId}:${assetId}`] = { title, filename: "本地上传", source_type: "local_upload" };
    localStorage.setItem(ASSET_TITLE_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  function applyLocalAssetOverride(item) {
    const override = assetTitleOverrides()[`${hub.assetLibraryId}:${item.id}`];
    return override ? { ...item, ...override } : item;
  }

  function downloadDesignMarkdown(design) {
    const content = `# ${design.title}\n\n- 需求 ID：${design.requirement_id}\n- 状态：${statusLabel(design.status)}\n- 版本：v${design.version}\n\n## 设计事件\n\n${design.events.map((event) => `### ${event.event_name} · ${event.event_title}\n\n${event.description}\n\n- 参数：${event.parameters.join(", ")}\n- 评审：${statusLabel(event.review_status)}\n`).join("\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${design.requirement_id || design.id}-tracking-design-v${design.version}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Markdown 已导出");
  }

  function hideAll() {
    browser?.classList.add("is-hidden");
    editor?.classList.add("is-hidden");
    Object.values(panels).forEach((panel) => panel?.classList.add("is-hidden"));
  }

  function showPanel(name) {
    hideAll();
    hub.activePanel = name;
    panels[name]?.classList.remove("is-hidden");
    refreshIcons();
  }

  function hasUnsavedAssetChanges() {
    if (hub.activePanel !== "assets" || !isDocumentAssetLibrary()) return false;
    const item = hub.assets.find((asset) => asset.id === hub.activeAssetId);
    const source = document.getElementById("knowledge-assets-detail")?.querySelector("#knowledge-asset-content");
    return Boolean(item && source && source.value !== item.content);
  }

  function confirmAssetNavigation(message = "当前文档有未保存的修改，确定离开吗？") {
    return !hasUnsavedAssetChanges() || window.confirm(message);
  }

  function returnHome() {
    if (!confirmAssetNavigation()) return;
    window.AIDWKnowledgeEditor?.closeRevisionDrawer();
    hideAll();
    hub.activePanel = "";
    browser?.classList.remove("is-hidden");
    if (typeof loadKnowledge === "function") loadKnowledge();
    refreshIcons();
  }

  window.AIDWKnowledgeHub = {
    hasUnsavedAssetChanges,
    loadAuth,
    discardUnsavedAssetChanges() {
      const item = hub.assets.find((asset) => asset.id === hub.activeAssetId);
      const detail = document.getElementById("knowledge-assets-detail");
      const source = detail?.querySelector("#knowledge-asset-content");
      if (!item || !source) return;
      source.value = item.content;
      hub.assetSaveFailedId = "";
      setAssetState(detail, item);
    },
  };

  async function run(action, message) {
    try {
      const result = await action();
      if (message) showToast(message);
      return result;
    } catch (error) {
      showToast(error.message);
      throw error;
    }
  }

  const assetCreateDialog = document.getElementById("knowledge-asset-create-dialog");
  const assetDeleteDialog = document.getElementById("knowledge-asset-delete-dialog");
  const assetAdminAllowed = () => Boolean(window.AIDWAccount?.isAdmin?.());

  function setAssetImportFile(file = null) {
    selectedAssetImportFile = file;
    const input = document.getElementById("knowledge-asset-create-file");
    const name = document.getElementById("knowledge-asset-create-file-name");
    const clear = document.getElementById("knowledge-asset-create-file-clear");
    input.value = "";
    name.textContent = file?.name || "未选择文件";
    name.title = file?.name || "";
    clear.hidden = !file;
  }

  function selectAssetImportFile(file) {
    const extension = String(file?.name || "").split(".").pop().toLowerCase();
    const error = document.getElementById("knowledge-asset-create-error");
    if (!file || !["md", "markdown", "json"].includes(extension)) {
      error.textContent = "请选择 .md、.markdown 或 .json 文件"; error.hidden = false;
      setAssetImportFile(); return;
    }
    if (file.size > MAX_ASSET_IMPORT_BYTES) {
      error.textContent = "本地文件不能超过 1 MB"; error.hidden = false;
      setAssetImportFile(); return;
    }
    error.textContent = ""; error.hidden = true;
    setAssetImportFile(file);
  }

  function openAssetCreateDialog() {
    if (!assetAdminAllowed()) { showToast("请联系管理员"); return; }
    document.getElementById("knowledge-asset-create-form").reset();
    setAssetImportFile();
    const error = document.getElementById("knowledge-asset-create-error");
    error.textContent = ""; error.hidden = true;
    assetCreateDialog.showModal();
    window.setTimeout(() => document.getElementById("knowledge-asset-create-name").focus(), 0);
  }

  function closeAssetCreateDialog() { setAssetImportFile(); assetCreateDialog.close(); }

  async function createAsset(event) {
    event.preventDefault();
    const name = document.getElementById("knowledge-asset-create-name").value.trim();
    const error = document.getElementById("knowledge-asset-create-error");
    if (!name) { error.textContent = "请输入条目名称"; error.hidden = false; return; }
    try {
      const content = selectedAssetImportFile ? (await selectedAssetImportFile.text()).replace(/^\uFEFF/, "") : "";
      if (selectedAssetImportFile?.name.toLowerCase().endsWith(".json")) {
        try { JSON.parse(content); } catch (_parseError) { error.textContent = "JSON 文件格式无效"; error.hidden = false; return; }
      }
      const response = await api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}`, {
        method: "POST",
        body: JSON.stringify({ title: name, content, source_filename: selectedAssetImportFile?.name || "", source_type: "local_upload" }),
      });
      rememberLocalAsset(hub.assetLibraryId, response.id, name);
      const created = { ...response, title: name, filename: "本地上传", source_type: "local_upload", source_filename: selectedAssetImportFile?.name || "", ...(content ? { content } : {}) };
      closeAssetCreateDialog();
      hub.assets.push(created); hub.activeAssetId = created.id;
      hub.assetEditorMode = "edit"; hub.assetEditorLayout = "single";
      renderAssets(); showToast("条目已创建");
    } catch (requestError) {
      error.textContent = requestError.message || "创建失败"; error.hidden = false;
    }
  }

  function openAssetDeleteDialog(item) {
    if (!assetAdminAllowed()) { showToast("请联系管理员"); return; }
    if (hasUnsavedAssetChanges()) { showToast("请先保存当前修改"); return; }
    assetDeleteDialog.dataset.assetId = item.id;
    document.getElementById("knowledge-asset-delete-name").textContent = item.title;
    const error = document.getElementById("knowledge-asset-delete-error");
    error.textContent = ""; error.hidden = true;
    assetDeleteDialog.showModal();
  }

  function closeAssetDeleteDialog() { delete assetDeleteDialog.dataset.assetId; assetDeleteDialog.close(); }

  async function deleteAsset() {
    const assetId = assetDeleteDialog.dataset.assetId;
    const error = document.getElementById("knowledge-asset-delete-error");
    if (!assetId) return;
    try {
      await api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/${encodeURIComponent(assetId)}`, { method: "DELETE" });
      const deletedIndex = hub.assets.findIndex((item) => item.id === assetId);
      hub.assets = hub.assets.filter((item) => item.id !== assetId);
      hub.activeAssetId = hub.assets[Math.min(deletedIndex, hub.assets.length - 1)]?.id || "";
      closeAssetDeleteDialog(); renderAssets(); showToast("条目已删除");
    } catch (requestError) {
      error.textContent = requestError.message || "删除失败"; error.hidden = false;
    }
  }

  window.openKnowledgeHubItem = (item) => {
    const id = String(item?.id || "");
    if (id === "requirement_routes") { showPanel("routes"); loadRoutes(); return true; }
    if (id === "validation_rules" || id === "validation_policy" || item?.hierarchy === "validation_rules") { showPanel("validation"); loadValidation(); return true; }
    if (id === "production_asset_catalog") { showPanel("production"); loadProduction(); return true; }
    if (id === "self_learning") { showPanel("self"); loadSelfLearning(); return true; }
    if (id.startsWith("knowledge_asset:")) { showPanel("assets"); loadAssets(item.asset_library_id || id.split(":")[1], item); return true; }
    if (id === "tracking_retrieval") { showPanel("tracking"); setTrackingTab("search"); return true; }
    if (id === "tracking_design") { showPanel("design"); loadDesigns(); return true; }
    if (id === "user_library") {
      showPanel("library");
      if (typeof loadLibraryBases === "function") loadLibraryBases();
      return true;
    }
    return false;
  };

  document.getElementById("knowledge-library-open")?.addEventListener("click", () => {
    window.openKnowledgeHubItem({ id: "user_library" });
  });

  document.querySelectorAll("[data-knowledge-hub-back]").forEach((button) => button.addEventListener("click", returnHome));
  document.getElementById("hub-library-back")?.addEventListener("click", returnHome);

  async function loadAuth() {
    const form = document.getElementById("knowledge-auth-form");
    form.innerHTML = '<div class="empty-row">正在加载认证配置...</div>';
    try {
      const data = await api("/api/auth-settings");
      const sections = (data.sections || []).filter((section) => section.id === "openai");
      form.innerHTML = sections.map((section) => `
        <section class="knowledge-auth-card" data-auth-section="${e(section.id)}">
          <header><span>${icon(section.id === "warehouse" ? "landmark" : section.id === "milvus" ? "boxes" : section.id === "mysql" ? "database" : section.id === "feishu" ? "file-text" : "key-round")}</span><div><strong>${e(section.title)}</strong><small>${e(section.description)}</small></div><span class="knowledge-configured">${section.configured ? "已配置" : "未配置"}</span></header>
          <div class="knowledge-fields">${section.fields.filter((field) => field.id !== "model").map((field) => `
            <label class="knowledge-field"><span>${e(field.label)}${field.secret && field.configured ? '<small class="knowledge-configured">已保存</small>' : ""}</span>
              <span class="${field.secret ? "knowledge-secret-wrap" : ""}"><input name="${e(section.id)}.${e(field.id)}" type="${field.secret ? "password" : field.number ? "number" : "text"}" value="${e(field.value)}" placeholder="${field.secret && field.configured ? "留空表示保持不变" : ""}" ${field.number ? 'inputmode="numeric"' : ""} ${field.readonly ? "readonly disabled" : ""}>${field.secret ? `<button type="button" data-secret-toggle aria-label="显示或隐藏${e(field.label)}" title="显示或隐藏">${icon("eye")}</button>` : ""}</span>
            </label>`).join("")}</div>
        </section>`).join("");
      form.querySelectorAll("[data-secret-toggle]").forEach((button) => button.addEventListener("click", () => {
        const input = button.parentElement.querySelector("input");
        input.type = input.type === "password" ? "text" : "password";
        button.innerHTML = icon(input.type === "password" ? "eye" : "eye-off");
        refreshIcons();
      }));
      document.getElementById("knowledge-auth-status").textContent = "密钥不会回显";
      refreshIcons();
    } catch (error) {
      form.innerHTML = `<div class="empty-row">${e(error.message)}</div>`;
    }
  }

  document.getElementById("knowledge-auth-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("knowledge-auth-status");
    status.textContent = "保存中...";
    const values = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      const [section, field] = key.split(".");
      values[section] ||= {};
      if (String(value) !== "") values[section][field] = value;
    });
    try {
      await api("/api/auth-settings", { method: "PUT", body: JSON.stringify({ sections: values }) });
      status.textContent = "已保存";
      showToast("管理已保存");
      loadAuth();
    } catch (error) { status.textContent = "保存失败"; showToast(error.message); }
  });

  async function loadRoutes(preferredId = "") {
    const list = document.getElementById("knowledge-route-list");
    list.innerHTML = '<div class="empty-row">正在加载路由...</div>';
    try {
      const data = await api("/api/requirement-routes");
      hub.routes = data.items || [];
      hub.activeRouteId = preferredId || (hub.routes.some((item) => item.id === hub.activeRouteId) ? hub.activeRouteId : hub.routes[0]?.id || "");
      document.getElementById("knowledge-routes-status").textContent = `${hub.routes.length} 条路由`;
      renderRoutes();
    } catch (error) { list.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  function renderRoutes() {
    const list = document.getElementById("knowledge-route-list");
    list.innerHTML = hub.routes.map((route) => `<button class="knowledge-record-button ${route.id === hub.activeRouteId ? "is-active" : ""}" type="button" data-route-id="${e(route.id)}"><strong>${e(route.title)}</strong><small>${e(route.description || route.filename)}</small><span>${e(route.route_key)}</span></button>`).join("") || '<div class="empty-row">暂无路由</div>';
    list.querySelectorAll("[data-route-id]").forEach((button) => button.addEventListener("click", () => { hub.activeRouteId = button.dataset.routeId; renderRoutes(); }));
    renderRouteDetail();
  }

  function renderRouteDetail() {
    const detail = document.getElementById("knowledge-route-detail");
    const route = hub.routes.find((item) => item.id === hub.activeRouteId);
    if (!route) { detail.innerHTML = '<div class="empty-row">选择一条路由查看规则</div>'; return; }
    detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>${e(route.title)}</h2><p>${e(route.description)} · ${e(route.parent_mode)} / ${e(route.route_key)}</p></div><div class="knowledge-detail-actions"><button class="command-button primary" type="button" data-route-save>${icon("save")}<span>保存规则</span></button></div></header><label class="knowledge-field"><span>路由规则 Markdown</span><textarea id="knowledge-route-content" class="knowledge-code-editor" spellcheck="false">${e(route.content)}</textarea></label><div class="knowledge-message">路由保存后将用于下一次需求解析；Mock 环境只在当前浏览器中生效。</div>`;
    detail.querySelector("[data-route-save]").addEventListener("click", async () => {
      const saved = await run(() => api(`/api/requirement-routes/${encodeURIComponent(route.id)}`, { method: "PUT", body: JSON.stringify({ content: document.getElementById("knowledge-route-content").value }) }), "路由规则已保存");
      route.content = saved.content; route.modified_at = saved.modified_at;
    });
    refreshIcons();
  }

  document.getElementById("knowledge-route-create")?.addEventListener("click", () => {
    const detail = document.getElementById("knowledge-route-detail");
    detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>新增需求路由</h2><p>创建一条并列的需求意图路由</p></div></header><form id="knowledge-route-create-form" class="knowledge-inline-form"><label class="knowledge-field"><span>名称</span><input name="title" required placeholder="例如：删除数仓对象"></label><label class="knowledge-field"><span>路由键</span><input name="route_key" required placeholder="例如：DELETE"></label><label class="knowledge-field"><span>父模式</span><select name="parent_mode"><option>ADD</option><option>MODIFY</option><option>DELETE</option><option>A_TO_B_REUSE</option><option selected>UNKNOWN</option></select></label><label class="knowledge-field is-wide"><span>说明</span><textarea name="description" placeholder="描述命中条件与处理边界"></textarea></label><button class="command-button primary" type="submit">${icon("plus")}<span>创建路由</span></button></form>`;
    detail.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      const created = await run(() => api("/api/requirement-routes", { method: "POST", body: JSON.stringify(payload) }), "路由已创建");
      loadRoutes(created.id);
    });
    refreshIcons();
  });

  async function loadValidation() {
    const nav = document.getElementById("knowledge-validation-nav");
    nav.innerHTML = '<div class="empty-row">正在加载规则...</div>';
    try { hub.validation = await api("/api/validation-rules"); renderValidation(); }
    catch (error) { nav.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  function renderValidation() {
    const data = hub.validation;
    const nav = document.getElementById("knowledge-validation-nav");
    nav.innerHTML = `<header><strong>变更策略</strong><span>${data.strategies.length}</span></header>${data.strategies.map((item, index) => `<button class="knowledge-record-button ${index === 0 ? "is-active" : ""}" type="button" data-validation-kind="strategy" data-validation-id="${e(item.id)}"><strong>${e(item.title)}</strong><small>${e(item.description)}</small><span>${item.required_operators.length}</span></button>`).join("")}<header><strong>稳定算子</strong><span>${data.operators.length}</span></header>${data.operators.map((item) => `<button class="knowledge-record-button" type="button" data-validation-kind="operator" data-validation-id="${e(item.id)}"><strong>${e(item.title)}</strong><small>${e(item.implementation)}</small></button>`).join("")}<header><strong>通用规则</strong><span>${data.rules.length}</span></header>${data.rules.map((item) => `<button class="knowledge-record-button" type="button" data-validation-kind="rule" data-validation-id="${e(item.id)}"><strong>${e(item.id)} · ${e(item.title)}</strong><small>${e(item.description)}</small></button>`).join("")}`;
    nav.querySelectorAll("[data-validation-id]").forEach((button) => button.addEventListener("click", () => {
      nav.querySelectorAll(".knowledge-record-button").forEach((row) => row.classList.toggle("is-active", row === button));
      renderValidationDetail(button.dataset.validationKind, button.dataset.validationId);
    }));
    document.getElementById("knowledge-validation-status").textContent = `${data.strategies.length} 个策略 · ${data.operators.length} 个算子 · ${data.rules.length} 条规则`;
    if (data.strategies[0]) renderValidationDetail("strategy", data.strategies[0].id);
  }

  function renderValidationDetail(kind, id) {
    const data = hub.validation;
    const detail = document.getElementById("knowledge-validation-detail");
    const collection = kind === "strategy" ? data.strategies : kind === "operator" ? data.operators : data.rules;
    const item = collection.find((entry) => entry.id === id);
    if (!item) return;
    if (kind === "strategy") {
      detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>${e(item.title)}</h2><p>${e(item.description)}</p></div><div class="knowledge-detail-actions"><button class="command-button primary" type="button" data-validation-save>${icon("save")}<span>保存策略</span></button></div></header><section class="knowledge-detail-section"><header><strong>必需验证算子</strong><small>按需求类型组合执行</small></header><div class="knowledge-checkbox-list">${data.operators.map((operator) => `<label class="knowledge-check-row"><input type="checkbox" value="${e(operator.id)}" ${item.required_operators.includes(operator.id) ? "checked" : ""}><span><strong>${e(operator.title)}</strong><small>${e(operator.description)}</small></span></label>`).join("")}</div></section>`;
      detail.querySelector("[data-validation-save]").addEventListener("click", async () => {
        const required_operators = [...detail.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
        await run(() => api(`/api/validation-rules/strategies/${encodeURIComponent(item.id)}`, { method: "PUT", body: JSON.stringify({ required_operators }) }), "验证策略已保存");
        item.required_operators = required_operators; renderValidation();
      });
    } else {
      const sql = item.sql_preview || item.template_sql || "暂无 SQL 模板";
      detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>${e(item.id)} · ${e(item.title)}</h2><p>${e(item.description)}</p></div><span class="knowledge-status-pill">${e(item.implementation || item.severity || item.category)}</span></header><div class="knowledge-detail-grid"><section class="knowledge-detail-section"><header><strong>参数</strong></header><div class="knowledge-tag-list">${(Array.isArray(item.parameters) ? item.parameters : Object.keys(item.parameters || {})).map((parameter) => `<span class="knowledge-tag">${e(parameter)}</span>`).join("") || '<span class="knowledge-tag">无参数</span>'}</div></section><section class="knowledge-detail-section"><header><strong>使用范围</strong></header><div class="knowledge-tag-list">${(item.used_by || item.engines || []).map((value) => `<span class="knowledge-tag">${e(value)}</span>`).join("") || '<span class="knowledge-tag">通用</span>'}</div></section></div><section class="knowledge-detail-section"><header><strong>SQL 模板预览</strong></header><pre>${e(sql)}</pre></section>`;
    }
    refreshIcons();
  }

  async function loadAssets(libraryId, item = {}) {
    const sameLibrary = hub.assetLibraryId === libraryId;
    hub.assetLibraryId = libraryId;
    const assetsPanel = document.getElementById("knowledge-assets");
    const isDimensionLibrary = libraryId === "dimension";
    const isDocumentLibrary = documentAssetLibraryIds.has(libraryId);
    assetsPanel?.classList.toggle("is-dimension-library", isDimensionLibrary);
    assetsPanel?.classList.toggle("is-document-library", isDocumentLibrary);
    if (!sameLibrary || item.title) document.getElementById("knowledge-assets-title").textContent = item.title || "知识资产";
    if (!sameLibrary || item.description) document.getElementById("knowledge-assets-description").textContent = item.description || "结构化事实、Markdown 投影与向量索引";
    document.getElementById("knowledge-assets-new").classList.toggle("is-hidden", !isDocumentLibrary);
    if (!sameLibrary) {
      const assetDetail = document.getElementById("knowledge-assets-detail");
      hub.assets = [];
      hub.activeAssetId = "";
      document.getElementById("knowledge-assets-count").textContent = "";
      document.getElementById("knowledge-assets-status").textContent = "";
      document.getElementById("knowledge-assets-list").innerHTML = '<div class="empty-row">正在加载知识条目...</div>';
      assetDetail.classList.remove("knowledge-editor", "is-single-pane", "is-split-pane", "knowledge-asset-workbench");
      assetDetail.innerHTML = '<div class="empty-row">正在加载文档...</div>';
    }
    try {
      const data = await api(`/api/knowledge-assets/${encodeURIComponent(libraryId)}`);
      hub.assets = (data.items || []).map(applyLocalAssetOverride);
      hub.activeAssetId = hub.assets.some((asset) => asset.id === hub.activeAssetId) ? hub.activeAssetId : hub.assets[0]?.id || "";
      renderAssets();
    } catch (error) { document.getElementById("knowledge-assets-list").innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  function filteredAssets() {
    const query = document.getElementById("knowledge-assets-query").value.trim().toLowerCase();
    return hub.assets.filter((item) => !query || `${item.title} ${item.id} ${item.filename}`.toLowerCase().includes(query));
  }

  function renderAssets({ renderDetail = true } = {}) {
    const items = filteredAssets();
    const isDocumentLibrary = isDocumentAssetLibrary();
    document.getElementById("knowledge-assets-count").textContent = `${hub.assets.length} 项`;
    const assetsStatus = document.getElementById("knowledge-assets-status");
    assetsStatus.textContent = `${hub.assets.filter((item) => !item.dirty && item.vector_sync_status === "synced").length}/${hub.assets.length} 可检索`;
    assetsStatus.classList.toggle("is-hidden", isDocumentLibrary);
    const learnAllButton = document.getElementById("knowledge-assets-learn-all");
    const learnAllText = isDocumentLibrary ? "整体学习" : "一键学习";
    if (learnAllButton) learnAllButton.innerHTML = `${icon(isDocumentLibrary ? "refresh-cw" : "brain-circuit")}<span>${learnAllText}</span>`;
    if (learnAllButton) learnAllButton.disabled = false;
    learnAllButton?.setAttribute("aria-label", learnAllText);
    learnAllButton?.setAttribute("title", learnAllText);
    const list = document.getElementById("knowledge-assets-list");
    list.innerHTML = items.map((item) => `<button class="knowledge-record-button ${item.id === hub.activeAssetId ? "is-active" : ""}" type="button" data-asset-id="${e(item.id)}"><strong>${e(item.title)}</strong><small>${e(item.filename)}</small></button>`).join("") || '<div class="empty-row">没有匹配的知识条目</div>';
    list.querySelectorAll("[data-asset-id]").forEach((button) => button.addEventListener("click", () => {
      if (hub.activeAssetId !== button.dataset.assetId) {
        if (!confirmAssetNavigation("当前文档有未保存的修改，确定切换吗？")) return;
        hub.assetEditorMode = "preview";
        hub.assetEditorLayout = "single";
        window.AIDWKnowledgeEditor?.closeRevisionDrawer();
      }
      hub.activeAssetId = button.dataset.assetId;
      renderAssets();
    }));
    if (renderDetail) renderAssetDetail();
    refreshIcons();
  }

  function assetPreviewSource(content) {
    return String(content || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trimStart();
  }

  function assetEditorFormat(item) {
    return item.editor_format === "json" || String(item.filename || "").toLowerCase().endsWith(".json") ? "json" : "markdown";
  }

  function renderAssetPreview(detail, item) {
    const preview = detail.querySelector("#knowledge-asset-preview");
    const source = detail.querySelector("#knowledge-asset-content");
    if (!preview || !source) return;
    if (assetEditorFormat(item) === "json") {
      let content = source.value;
      try { content = JSON.stringify(JSON.parse(content), null, 2); } catch (_error) { /* Keep incomplete JSON visible while editing. */ }
      preview.innerHTML = `<pre>${e(content)}</pre>`;
      return;
    }
    preview.innerHTML = window.AIDWKnowledgeEditor?.renderMarkdown(assetPreviewSource(source.value)) || `<pre>${e(assetPreviewSource(source.value))}</pre>`;
  }

  function applyAssetPresentation(detail, item, { focus = false } = {}) {
    const source = detail.querySelector("#knowledge-asset-source-pane");
    const preview = detail.querySelector("#knowledge-asset-preview-pane");
    const modeButtons = detail.querySelectorAll("[data-asset-editor-mode]");
    const splitButton = detail.querySelector("[data-asset-editor-split]");
    modeButtons.forEach((button) => { button.dataset.knowledgeEditorSingleMode = button.dataset.assetEditorMode; });
    window.AIDWKnowledgeEditor?.applyPresentation({
      root: detail,
      sourcePane: source,
      previewPane: preview,
      modeButtons,
      splitButton,
      mode: hub.assetEditorMode,
      layout: hub.assetEditorLayout,
    });
    if (hub.assetEditorMode !== "edit" || hub.assetEditorLayout === "split") renderAssetPreview(detail, item);
    if (focus && (hub.assetEditorMode === "edit" || hub.assetEditorLayout === "split")) detail.querySelector("#knowledge-asset-content")?.focus({ preventScroll: true });
  }

  function setAssetState(detail, item) {
    const source = detail.querySelector("#knowledge-asset-content");
    const saveButton = detail.querySelector("[data-asset-save]");
    const learnButton = detail.querySelector("[data-asset-learn]");
    const saveState = detail.querySelector("[data-asset-save-state]");
    const learnState = detail.querySelector("[data-asset-learn-state]");
    const historyButton = detail.querySelector("[data-asset-history]");
    const learnAllButton = document.getElementById("knowledge-assets-learn-all");
    const changed = source.value !== item.content;
    const saving = hub.savingAssetId === item.id;
    const saveFailed = hub.assetSaveFailedId === item.id;
    const learning = hub.learningAssetId === item.id;
    const learnStateText = learning ? "学习中" : item.dirty ? "待学习" : "已学习";
    const learnStateIcon = learning ? "loader-circle" : item.dirty ? "circle-alert" : "circle-check";
    const saveStateText = saving
      ? "保存中..."
      : saveFailed
        ? "保存失败"
        : changed
          ? "未保存"
          : "";
    saveButton.disabled = !changed || saving || learning;
    learnButton.disabled = changed || saving || learning;
    historyButton.disabled = saving || learning;
    source.disabled = saving || learning;
    if (learnAllButton) learnAllButton.disabled = changed || saving || learning;
    saveButton.classList.toggle("primary", changed && !saving && !learning);
    learnButton.classList.toggle("primary", !changed && item.dirty && !saving && !learning);
    learnButton.classList.toggle("is-loading", learning);
    learnButton.setAttribute("aria-busy", String(learning));
    saveState.className = `knowledge-editor-status knowledge-asset-save-state ${changed || saveFailed ? "is-warning" : ""}`;
    saveState.textContent = saveStateText;
    learnState.className = `knowledge-asset-state ${item.dirty ? "is-warning" : "is-success"}`;
    learnState.innerHTML = `${icon(learnStateIcon)}<span>${learnStateText}</span>`;
  }

  function openAssetHistory(detail, item) {
    window.AIDWKnowledgeEditor?.openRevisionDrawer({
      title: `${item.title} · 历史版本`,
      apiBase: `/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/${encodeURIComponent(item.id)}/revisions`,
      currentContent: () => detail.querySelector("#knowledge-asset-content")?.value || item.content,
      hasUnsavedChanges: () => (detail.querySelector("#knowledge-asset-content")?.value || "") !== item.content,
      async onRestored(restored) {
        Object.assign(item, restored);
        hub.assetEditorMode = "preview";
        hub.assetEditorLayout = "single";
        renderAssets();
      },
    });
  }

  function renderDocumentAssetDetail(detail, item) {
    const editorFormat = assetEditorFormat(item);
    const editorLabel = editorFormat === "json" ? "JSON" : "Markdown";
    detail.classList.add("knowledge-editor", "is-single-pane", "knowledge-asset-workbench");
    detail.innerHTML = `<header class="knowledge-editor-head knowledge-asset-document-head"><div class="knowledge-editor-title"><strong>${e(item.title)}</strong><div class="knowledge-editor-meta"><small>${e(item.filename)} · 版本 ${e(item.version)} · 更新于 ${formatDate(item.updated_at)}</small><span class="knowledge-editor-status knowledge-asset-save-state" data-asset-save-state></span><span class="knowledge-asset-state" data-asset-learn-state></span></div></div><div class="knowledge-editor-modebar" role="group" aria-label="查看方式"><button class="knowledge-editor-mode-button" type="button" title="预览文档" data-asset-editor-mode="preview">${icon("eye")}<span>预览</span></button><button class="knowledge-editor-split-button" type="button" data-asset-editor-split aria-label="分栏查看" title="分栏查看" aria-pressed="false">${icon("columns-2")}</button></div><div class="knowledge-editor-actions" role="group" aria-label="文档操作"><button class="icon-button" type="button" data-asset-history aria-label="查看历史版本" title="历史版本">${icon("history")}</button><button class="knowledge-editor-mode-button" type="button" title="编辑文档" data-asset-editor-mode="edit">${icon("pencil")}<span>编辑</span></button><button class="icon-button danger" type="button" data-asset-delete aria-label="删除当前条目" title="删除条目">${icon("trash-2")}</button><button class="command-button" type="button" data-asset-save disabled>${icon("save")}<span>保存</span></button></div><div class="knowledge-asset-learn-actions" role="group" aria-label="知识学习操作"><button class="command-button" type="button" data-asset-learn aria-busy="false">${icon("refresh-cw")}<span>学习</span></button></div></header><div class="knowledge-editor-layout knowledge-asset-editor-layout"><section id="knowledge-asset-source-pane" class="knowledge-pane"><header><strong>${editorLabel}</strong><small>${e(item.filename)}</small></header><textarea id="knowledge-asset-content" spellcheck="false" aria-label="${editorLabel} 内容">${e(item.content)}</textarea></section><section id="knowledge-asset-preview-pane" class="knowledge-pane"><header><strong>预览</strong><small>实时更新</small></header><div id="knowledge-asset-preview" class="knowledge-preview markdown-content"></div></section></div>`;
    const source = detail.querySelector("#knowledge-asset-content");
    detail.querySelectorAll("[data-asset-editor-mode]").forEach((button) => button.addEventListener("click", () => {
      hub.assetEditorMode = button.dataset.assetEditorMode === "edit" ? "edit" : "preview";
      hub.assetEditorLayout = "single";
      applyAssetPresentation(detail, item, { focus: true });
    }));
    detail.querySelector("[data-asset-editor-split]").addEventListener("click", () => {
      hub.assetEditorLayout = hub.assetEditorLayout === "split" ? "single" : "split";
      applyAssetPresentation(detail, item, { focus: true });
    });
    source.addEventListener("input", () => {
      hub.assetSaveFailedId = "";
      setAssetState(detail, item);
      if (hub.assetEditorLayout === "split") renderAssetPreview(detail, item);
      refreshIcons();
    });
    source.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        detail.querySelector("[data-asset-save]").click();
      }
    });
    detail.querySelector("[data-asset-history]").addEventListener("click", () => openAssetHistory(detail, item));
    detail.querySelector("[data-asset-delete]").addEventListener("click", () => openAssetDeleteDialog(item));
    detail.querySelector("[data-asset-save]").addEventListener("click", async () => {
      if (source.value === item.content) return;
      hub.savingAssetId = item.id;
      hub.assetSaveFailedId = "";
      setAssetState(detail, item);
      try {
        const saved = await run(() => api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/${encodeURIComponent(item.id)}/draft`, { method: "PUT", body: JSON.stringify({ content: source.value }) }), "知识内容已保存");
        Object.assign(item, saved);
        hub.savingAssetId = "";
        renderAssets();
      } catch (_error) {
        hub.savingAssetId = "";
        hub.assetSaveFailedId = item.id;
        setAssetState(detail, item);
        refreshIcons();
      }
    });
    detail.querySelector("[data-asset-learn]").addEventListener("click", async () => {
      hub.learningAssetId = item.id;
      setAssetState(detail, item);
      refreshIcons();
      try {
        const saved = await run(() => api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/${encodeURIComponent(item.id)}/learn`, { method: "POST", body: "{}" }), "知识学习完成");
        Object.assign(item, saved);
      } catch (_error) {
        // The shared request helper already reports the failure.
      } finally {
        hub.learningAssetId = "";
        renderAssets();
      }
    });
    applyAssetPresentation(detail, item);
    setAssetState(detail, item);
    refreshIcons();
  }

  function renderAssetDetail() {
    const item = hub.assets.find((asset) => asset.id === hub.activeAssetId);
    const detail = document.getElementById("knowledge-assets-detail");
    if (!item) { detail.innerHTML = '<div class="empty-row">选择一条知识查看详情</div>'; return; }
    const isDocumentLibrary = isDocumentAssetLibrary();
    detail.classList.toggle("knowledge-editor", isDocumentLibrary);
    detail.classList.toggle("is-single-pane", isDocumentLibrary);
    detail.classList.toggle("knowledge-asset-workbench", isDocumentLibrary);
    if (!isDocumentLibrary) detail.classList.remove("is-split-pane");
    if (isDocumentLibrary) { renderDocumentAssetDetail(detail, item); return; }
    const statusText = item.dirty ? "已保存，等待学习" : "已学习，向量已同步";
    detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>${e(item.title)}</h2><p>${e(item.filename)} · 版本 ${e(item.version)} · 更新于 ${formatDate(item.updated_at)}</p></div><div class="knowledge-detail-actions"><button class="command-button" type="button" data-asset-save>${icon("save")}<span>保存草稿</span></button><button class="command-button primary" type="button" data-asset-learn>${icon("brain-circuit")}<span>学习</span></button></div></header><div class="knowledge-tag-list"><span class="knowledge-tag ${item.dirty ? "is-warning" : "is-success"}">${item.dirty ? "内容待学习" : "内容已学习"}</span><span class="knowledge-tag">向量：${e(item.vector_sync_status)}</span><span class="knowledge-tag">${e(item.editor_format)}</span></div><section class="knowledge-detail-section"><header><strong>${item.editor_format === "json" ? "JSON 内容" : "Markdown 内容"}</strong><small>保存草稿后需再次学习</small></header><textarea id="knowledge-asset-content" class="knowledge-code-editor" spellcheck="false">${e(item.content)}</textarea></section>`;
    const editor = detail.querySelector("#knowledge-asset-content");
    const saveButton = detail.querySelector("[data-asset-save]");
    const learnButton = detail.querySelector("[data-asset-learn]");
    saveButton.addEventListener("click", async () => {
      const saved = await run(() => api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/${encodeURIComponent(item.id)}/draft`, { method: "PUT", body: JSON.stringify({ content: document.getElementById("knowledge-asset-content").value }) }), "知识草稿已保存");
      Object.assign(item, saved); renderAssets();
    });
    learnButton.addEventListener("click", async () => {
      const saved = await run(() => api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/${encodeURIComponent(item.id)}/learn`, { method: "POST", body: "{}" }), "知识学习完成");
      Object.assign(item, saved); renderAssets();
    });
    refreshIcons();
  }

  document.getElementById("knowledge-assets-query")?.addEventListener("input", () => renderAssets({ renderDetail: false }));
  document.getElementById("knowledge-assets-learn-all")?.addEventListener("click", async () => {
    if (hasUnsavedAssetChanges()) {
      showToast("请先保存当前修改，再进行整体学习");
      return;
    }
    await run(() => api(`/api/knowledge-assets/${encodeURIComponent(hub.assetLibraryId)}/batch/learn`, { method: "POST", body: "{}" }), "整体学习已完成");
    loadAssets(hub.assetLibraryId);
  });
  document.getElementById("knowledge-assets-new")?.addEventListener("click", openAssetCreateDialog);
  document.getElementById("knowledge-asset-create-form")?.addEventListener("submit", createAsset);
  document.getElementById("knowledge-asset-create-file-open")?.addEventListener("click", () => document.getElementById("knowledge-asset-create-file").click());
  document.getElementById("knowledge-asset-create-file")?.addEventListener("change", (event) => selectAssetImportFile(event.target.files?.[0]));
  document.getElementById("knowledge-asset-create-file-clear")?.addEventListener("click", () => setAssetImportFile());
  document.getElementById("knowledge-asset-create-close")?.addEventListener("click", closeAssetCreateDialog);
  document.getElementById("knowledge-asset-create-cancel")?.addEventListener("click", closeAssetCreateDialog);
  document.getElementById("knowledge-asset-delete-close")?.addEventListener("click", closeAssetDeleteDialog);
  document.getElementById("knowledge-asset-delete-cancel")?.addEventListener("click", closeAssetDeleteDialog);
  document.getElementById("knowledge-asset-delete-confirm")?.addEventListener("click", deleteAsset);
  [assetCreateDialog, assetDeleteDialog].forEach((dialog) => dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));

  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedAssetChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  async function loadProduction() {
    const metrics = document.getElementById("knowledge-production-metrics");
    metrics.innerHTML = '<div class="empty-row">正在加载目录状态...</div>';
    try { renderProductionStatus(await api("/api/production-assets/status")); await searchProduction(); }
    catch (error) { metrics.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  function renderProductionStatus(data) {
    const values = [["projects", "Project", "folder-kanban"], ["flows", "Flow", "workflow"], ["jobs", "Job", "square-terminal"], ["detailed_flows", "已同步详情", "circle-check-big"]];
    document.getElementById("knowledge-production-metrics").innerHTML = values.map(([key, label, glyph]) => `<div class="knowledge-stat"><span class="knowledge-stat-icon">${icon(glyph)}</span><span><strong>${e(data.counts?.[key] || 0)}</strong><small>${label}</small></span></div>`).join("");
    document.getElementById("knowledge-production-status").textContent = `${data.message || "目录已就绪"} · ${formatDate(data.synced_at)}`;
    refreshIcons();
  }

  async function searchProduction() {
    const query = document.getElementById("knowledge-production-query").value.trim();
    const data = await api(`/api/production-assets/search?q=${encodeURIComponent(query)}`);
    document.getElementById("knowledge-production-results").innerHTML = `<div class="knowledge-message">${e(data.evidence_notice)}</div>${data.results.map((item) => `<div class="knowledge-result-row"><span>${icon(item.type === "project" ? "folder-kanban" : item.type === "flow" ? "workflow" : "square-terminal")}</span><div><strong>${e(item.name)}</strong><small>${e(item.path)}</small></div><span class="knowledge-status-pill">${e(item.type)}</span></div>`).join("") || '<div class="empty-row">没有匹配的生产资产</div>'}`;
    refreshIcons();
  }
  document.getElementById("knowledge-production-query")?.addEventListener("input", searchProduction);
  document.getElementById("knowledge-production-sync")?.addEventListener("click", async () => renderProductionStatus(await run(() => api("/api/production-assets/sync", { method: "POST", body: "{}" }), "生产资产目录已同步")));

  async function loadSelfLearning() {
    const filter = document.getElementById("knowledge-self-filter").value;
    try {
      hub.selfLearning = await api(`/api/self-learning${filter ? `?status=${encodeURIComponent(filter)}` : ""}`);
      hub.activeSelfId = hub.selfLearning.some((item) => item.id === hub.activeSelfId) ? hub.activeSelfId : hub.selfLearning[0]?.id || "";
      renderSelfLearning();
    } catch (error) { document.getElementById("knowledge-self-list").innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  function renderSelfLearning() {
    const list = document.getElementById("knowledge-self-list");
    list.innerHTML = hub.selfLearning.map((item) => `<button class="knowledge-record-button ${item.id === hub.activeSelfId ? "is-active" : ""}" type="button" data-self-id="${e(item.id)}"><strong>${e(item.title)}</strong><small>${e(item.type)} · v${e(item.version)}</small><span>${statusLabel(item.status)}</span></button>`).join("") || '<div class="empty-row">当前筛选下暂无记录</div>';
    list.querySelectorAll("[data-self-id]").forEach((button) => button.addEventListener("click", () => { hub.activeSelfId = button.dataset.selfId; renderSelfLearning(); }));
    const item = hub.selfLearning.find((entry) => entry.id === hub.activeSelfId);
    const detail = document.getElementById("knowledge-self-detail");
    if (!item) { detail.innerHTML = '<div class="empty-row">选择一条记录查看详情</div>'; return; }
    detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>${e(item.title)}</h2><p>${e(item.id)} · ${formatDate(item.updated_at)}</p></div><span class="knowledge-status-pill ${item.status === "active" ? "is-ready" : "is-review"}">${statusLabel(item.status)}</span></header><section class="knowledge-detail-section"><header><strong>正向指令</strong></header><div class="knowledge-message">${e(item.instruction)}</div></section><section class="knowledge-detail-section"><header><strong>禁止项</strong></header><div class="knowledge-message is-warning">${e(item.negative_instruction || "无")}</div></section><div class="knowledge-detail-grid"><section class="knowledge-detail-section"><header><strong>作用域</strong></header><pre>${e(JSON.stringify(item.scope || {}, null, 2))}</pre></section><section class="knowledge-detail-section"><header><strong>来源与验证</strong></header><pre>${e(JSON.stringify({ source: item.source, validation: item.validation }, null, 2))}</pre></section></div><section class="knowledge-detail-section"><header><strong>状态操作</strong></header><div class="knowledge-detail-actions">${[["active", "启用"], ["pending_validation", "待验证"], ["revoked", "停用"]].map(([value, label]) => `<button class="command-button ${item.status === value ? "primary" : ""}" type="button" data-self-status="${value}" ${item.status === value ? "disabled" : ""}><span>${label}</span></button>`).join("")}</div></section>`;
    detail.querySelectorAll("[data-self-status]").forEach((button) => button.addEventListener("click", async () => {
      await run(() => api(`/api/self-learning/${encodeURIComponent(item.id)}/status`, { method: "PATCH", body: JSON.stringify({ status: button.dataset.selfStatus, reason: "在知识库中手动更新" }) }), "自学习状态已更新");
      loadSelfLearning();
    }));
  }
  document.getElementById("knowledge-self-filter")?.addEventListener("change", loadSelfLearning);

  function setTrackingTab(tab) {
    hub.trackingTab = tab;
    document.querySelectorAll("[data-tracking-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.trackingTab === tab));
    if (tab === "search") renderTrackingSearch();
    if (tab === "sync") loadTrackingSync();
    if (tab === "events") loadTrackingEvents();
    if (tab === "evaluation") loadTrackingEvaluation();
  }
  document.querySelectorAll("[data-tracking-tab]").forEach((button) => button.addEventListener("click", () => setTrackingTab(button.dataset.trackingTab)));
  document.getElementById("knowledge-tracking-refresh")?.addEventListener("click", () => setTrackingTab(hub.trackingTab));

  function renderTrackingSearch() {
    const body = document.getElementById("knowledge-tracking-body");
    body.innerHTML = `<form id="tracking-search-form"><div class="knowledge-tab-toolbar"><label class="knowledge-wide-search">${icon("search")}<input name="query" required placeholder="输入业务含义、事件名或参数，例如：关卡失败原因"></label><button class="command-button primary" type="submit">${icon("search")}<span>检索</span></button></div><div class="knowledge-inline-form"><label class="knowledge-field"><span>应用范围</span><select name="app"><option value="demo">Demo</option><option value="all">全部应用</option></select></label><label class="knowledge-field"><span>返回数量</span><select name="limit"><option>10</option><option>20</option><option>50</option></select></label></div></form><div id="tracking-search-results" class="knowledge-result-list"><div class="knowledge-empty-state">${icon("scan-search")}<strong>输入语义或事件名开始检索</strong><small>结果会同时展示关键词证据与向量相似度</small></div></div>`;
    body.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.currentTarget)); payload.limit = Number(payload.limit);
      const results = document.getElementById("tracking-search-results"); results.innerHTML = '<div class="empty-row">正在检索...</div>';
      try {
        const data = await api("/api/tracking/search", { method: "POST", body: JSON.stringify(payload) });
        results.innerHTML = `<div class="knowledge-message">${e(data.notice || `共命中 ${data.results.length} 条物理事件`)}</div>${data.results.map((item) => `<div class="knowledge-result-row"><span>${icon("mouse-pointer-click")}</span><div><strong>${e(item.event_name)} · ${e(item.event_title)}</strong><small>${e(item.description)} · ${e(item.source_path)}</small></div><span class="knowledge-status-pill">${Number(item.score || 0).toFixed(3)}</span></div>`).join("") || '<div class="empty-row">没有匹配的历史埋点</div>'}`;
        document.getElementById("knowledge-tracking-status").textContent = `检索完成 · ${data.results.length} 条`;
        refreshIcons();
      } catch (error) { results.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
    });
    refreshIcons();
  }

  async function loadTrackingSync() {
    const body = document.getElementById("knowledge-tracking-body"); body.innerHTML = '<div class="empty-row">正在加载同步状态...</div>';
    try {
      const data = await api("/api/tracking/sync/status");
      body.innerHTML = `<div class="knowledge-stat-grid">${[["documents", "源文档", "files"], ["events", "物理事件", "list-tree"], ["vectors", "向量切片", "boxes"], ["failures", "失败节点", "triangle-alert"]].map(([key, label, glyph]) => `<div class="knowledge-stat"><span class="knowledge-stat-icon">${icon(glyph)}</span><span><strong>${e(data.counts?.[key] || 0)}</strong><small>${label}</small></span></div>`).join("")}</div><div class="knowledge-message">${e(data.message)} · ${formatDate(data.synced_at)}</div><button class="command-button primary" type="button" id="tracking-sync-start">${icon("refresh-cw")}<span>立即同步</span></button>`;
      body.querySelector("#tracking-sync-start").addEventListener("click", async () => { await run(() => api("/api/tracking/sync", { method: "POST", body: JSON.stringify({ app: "demo", mode: "incremental" }) }), "历史埋点同步完成"); loadTrackingSync(); });
      refreshIcons();
    } catch (error) { body.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  async function loadTrackingEvents() {
    const body = document.getElementById("knowledge-tracking-body"); body.innerHTML = '<div class="empty-row">正在加载物理事件...</div>';
    try {
      const data = await api("/api/tracking/events");
      body.innerHTML = `<div class="knowledge-tab-toolbar"><label class="knowledge-wide-search">${icon("search")}<input id="tracking-event-filter" placeholder="筛选事件名称或说明"></label><span class="knowledge-status-pill">${data.items.length} 个事件</span></div><div id="tracking-event-list" class="knowledge-result-list"></div>`;
      const render = () => {
        const query = body.querySelector("#tracking-event-filter").value.toLowerCase();
        body.querySelector("#tracking-event-list").innerHTML = data.items.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query)).map((item) => `<div class="knowledge-result-row"><span>${icon("mouse-pointer-click")}</span><div><strong>${e(item.event_name)} · ${e(item.event_title)}</strong><small>${e(item.description)} · ${item.parameters.length} 个参数</small></div><span class="knowledge-status-pill">${e(item.app)}</span></div>`).join("") || '<div class="empty-row">没有匹配事件</div>';
        refreshIcons();
      };
      body.querySelector("#tracking-event-filter").addEventListener("input", render); render();
    } catch (error) { body.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  async function loadTrackingEvaluation() {
    const body = document.getElementById("knowledge-tracking-body"); body.innerHTML = '<div class="empty-row">正在加载评测门禁...</div>';
    try {
      const [latest, golden] = await Promise.all([api("/api/tracking/evaluation/latest"), api("/api/tracking/golden-queries")]);
      body.innerHTML = `<div class="knowledge-stat-grid">${[[latest.precision_at_5, "P@5", "target"], [latest.recall_at_10, "R@10", "scan-search"], [latest.mrr, "MRR", "chart-no-axes-column-increasing"], [latest.passed ? "通过" : "未通过", "Phase 0 门禁", "shield-check"]].map(([value, label, glyph]) => `<div class="knowledge-stat"><span class="knowledge-stat-icon">${icon(glyph)}</span><span><strong>${e(value)}</strong><small>${label}</small></span></div>`).join("")}</div><div class="knowledge-detail-grid"><section class="knowledge-detail-section"><header><strong>Golden Query · ${golden.items.length} 条</strong></header><div class="knowledge-result-list">${golden.items.map((item) => `<div class="knowledge-result-row"><span>${icon("badge-check")}</span><div><strong>${e(item.query)}</strong><small>期望事件：${e(item.expected_event_names.join(", "))}</small></div></div>`).join("")}</div></section><section class="knowledge-detail-section"><header><strong>新增 Golden Query</strong></header><form id="tracking-golden-form" class="knowledge-fields"><label class="knowledge-field"><span>查询语句</span><input name="query" required placeholder="例如：关卡失败原因"></label><label class="knowledge-field"><span>期望事件名</span><input name="expected" required placeholder="多个事件用逗号分隔"></label><button class="command-button" type="submit">${icon("plus")}<span>添加</span></button><button class="command-button primary" type="button" id="tracking-evaluate">${icon("play")}<span>运行评测</span></button></form></section></div>`;
      body.querySelector("#tracking-golden-form").addEventListener("submit", async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await run(() => api("/api/tracking/golden-queries", { method: "POST", body: JSON.stringify({ query: data.query, expected_event_names: data.expected.split(",").map((value) => value.trim()).filter(Boolean) }) }), "Golden Query 已添加"); loadTrackingEvaluation(); });
      body.querySelector("#tracking-evaluate").addEventListener("click", async () => { await run(() => api("/api/tracking/evaluation", { method: "POST", body: JSON.stringify({ app: "demo" }) }), "评测已完成"); loadTrackingEvaluation(); });
      refreshIcons();
    } catch (error) { body.innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  async function loadDesigns(preferredId = "") {
    try {
      const data = await api("/api/tracking/designs"); hub.designs = data.items || [];
      hub.activeDesignId = preferredId || (hub.designs.some((item) => item.id === hub.activeDesignId) ? hub.activeDesignId : hub.designs[0]?.id || "");
      renderDesigns();
    } catch (error) { document.getElementById("knowledge-design-list").innerHTML = `<div class="empty-row">${e(error.message)}</div>`; }
  }

  function renderDesigns() {
    document.getElementById("knowledge-design-count").textContent = `${hub.designs.length} 项`;
    const list = document.getElementById("knowledge-design-list");
    list.innerHTML = hub.designs.map((item) => `<button class="knowledge-record-button ${item.id === hub.activeDesignId ? "is-active" : ""}" type="button" data-design-id="${e(item.id)}"><strong>${e(item.title)}</strong><small>${e(item.requirement_id)} · v${e(item.version)}</small><span>${statusLabel(item.status)}</span></button>`).join("") || '<div class="empty-row">暂无设计单</div>';
    list.querySelectorAll("[data-design-id]").forEach((button) => button.addEventListener("click", () => { hub.activeDesignId = button.dataset.designId; renderDesigns(); }));
    renderDesignDetail();
  }

  function renderDesignDetail() {
    const item = hub.designs.find((design) => design.id === hub.activeDesignId);
    const detail = document.getElementById("knowledge-design-detail");
    if (!item) { detail.innerHTML = '<div class="empty-row">选择设计单或新建设计单</div>'; return; }
    detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>${e(item.title)}</h2><p>${e(item.requirement_id)} · ${e(item.owner)} · 更新于 ${formatDate(item.updated_at)}</p></div><span class="knowledge-status-pill ${item.status === "frozen" ? "is-frozen" : item.status === "ready" ? "is-ready" : "is-review"}">${statusLabel(item.status)}</span></header><div class="knowledge-message">${e(item.summary)}</div><section class="knowledge-detail-section"><header><strong>设计事件 · ${item.events.length}</strong><small>事件级评审互不影响</small></header><div class="knowledge-event-list">${item.events.map((event) => `<article class="knowledge-event"><strong>${e(event.event_name)} · ${e(event.event_title)}</strong><span class="knowledge-status-pill ${event.review_status === "approved" ? "is-ready" : "is-review"}">${statusLabel(event.review_status)}</span><p>${e(event.description)} · 参数：${e(event.parameters.join(", "))}</p>${item.status !== "frozen" ? `<div class="knowledge-detail-actions"><button class="command-button" type="button" data-event-review="approved" data-event-id="${e(event.id)}"><span>通过</span></button><button class="command-button" type="button" data-event-review="rejected" data-event-id="${e(event.id)}"><span>需修改</span></button></div>` : ""}</article>`).join("")}</div></section><section class="knowledge-detail-section"><header><strong>设计操作</strong></header><div class="knowledge-detail-actions"><button class="command-button" type="button" data-design-recheck>${icon("refresh-cw")}<span>重新检查</span></button><button class="command-button primary" type="button" data-design-freeze ${item.status === "frozen" ? "disabled" : ""}>${icon("snowflake")}<span>冻结评审版</span></button><button class="command-button" type="button" data-design-export="markdown">${icon("download")}<span>导出 Markdown</span></button><button class="command-button" type="button" data-design-revisions>${icon("history")}<span>版本记录</span></button></div></section><div id="knowledge-design-extra"></div>`;
    detail.querySelectorAll("[data-event-review]").forEach((button) => button.addEventListener("click", async () => { await run(() => api(`/api/tracking/designs/${encodeURIComponent(item.id)}/events/${encodeURIComponent(button.dataset.eventId)}/review`, { method: "POST", body: JSON.stringify({ status: button.dataset.eventReview, comment: "知识库评审" }) }), "事件评审已更新"); loadDesigns(item.id); }));
    detail.querySelector("[data-design-recheck]").addEventListener("click", async () => { await run(() => api(`/api/tracking/designs/${encodeURIComponent(item.id)}/recheck`, { method: "POST", body: "{}" }), "设计门禁已重新检查"); loadDesigns(item.id); });
    detail.querySelector("[data-design-freeze]").addEventListener("click", async () => { await run(() => api(`/api/tracking/designs/${encodeURIComponent(item.id)}/freeze`, { method: "POST", body: JSON.stringify({ actor: "demo.user" }) }), "评审版已冻结"); loadDesigns(item.id); });
    detail.querySelector("[data-design-export]").addEventListener("click", () => downloadDesignMarkdown(item));
    detail.querySelector("[data-design-revisions]").addEventListener("click", async () => { const data = await api(`/api/tracking/designs/${encodeURIComponent(item.id)}/revisions`); detail.querySelector("#knowledge-design-extra").innerHTML = `<section class="knowledge-detail-section"><header><strong>版本记录</strong></header><pre>${e(data.items.map((revision) => `v${revision.version} · ${revision.status} · ${formatDate(revision.created_at)}`).join("\n"))}</pre></section>`; });
    refreshIcons();
  }

  document.getElementById("knowledge-design-new")?.addEventListener("click", () => {
    const detail = document.getElementById("knowledge-design-detail");
    detail.innerHTML = `<header class="knowledge-detail-head"><div><h2>新建埋点设计单</h2><p>从策划目标拆解业务事件并进入事件级评审</p></div></header><form id="knowledge-design-create-form" class="knowledge-inline-form"><label class="knowledge-field"><span>设计单标题</span><input name="title" required placeholder="例如：新手引导埋点设计"></label><label class="knowledge-field"><span>需求 ID</span><input name="requirement_id" required placeholder="REQ-2026-001"></label><label class="knowledge-field is-wide"><span>策划目标与范围</span><textarea name="summary" required placeholder="描述玩法目标、关键路径和验收范围"></textarea></label><button class="command-button primary" type="submit">${icon("wand-sparkles")}<span>生成设计草稿</span></button></form>`;
    detail.querySelector("form").addEventListener("submit", async (event) => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget)); payload.app = "demo"; const created = await run(() => api("/api/tracking/designs", { method: "POST", body: JSON.stringify(payload) }), "埋点设计单已创建"); loadDesigns(created.id); });
    refreshIcons();
  });
})();
