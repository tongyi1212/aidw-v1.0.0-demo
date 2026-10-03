const libraryState = {
  mode: "catalog",
  catalog: null,
  catalogNode: { kind: "category", id: "tables" },
  expanded: new Set(["category:tables"]),
  bases: [],
  activeBase: null,
  files: [],
  selectedFiles: new Set(),
  dialogMode: "create",
  confirmAction: null,
};

const libraryElements = {
  view: document.getElementById("library-view"),
  catalogPanel: document.getElementById("library-catalog-panel"),
  knowledgePanel: document.getElementById("library-knowledge-panel"),
  catalogTree: document.getElementById("catalog-tree"),
  catalogTreeSearch: document.getElementById("catalog-tree-search"),
  catalogDetailSearch: document.getElementById("catalog-detail-search"),
  catalogDetailTitle: document.getElementById("catalog-detail-title"),
  catalogDetailPath: document.getElementById("catalog-detail-path"),
  catalogDetailIcon: document.getElementById("catalog-detail-icon"),
  catalogDetailBody: document.getElementById("catalog-detail-body"),
  baseBrowser: document.getElementById("library-base-browser"),
  baseDetail: document.getElementById("library-base-detail"),
  grid: document.getElementById("library-grid"),
  search: document.getElementById("library-search"),
  detailName: document.getElementById("library-detail-name"),
  detailDescription: document.getElementById("library-detail-description"),
  detailMeta: document.getElementById("library-detail-meta"),
  stats: document.getElementById("library-stats"),
  fileSearch: document.getElementById("library-file-search"),
  fileBody: document.getElementById("library-file-body"),
  fileFooter: document.getElementById("library-file-footer"),
  selectAll: document.getElementById("library-select-all"),
  batchDelete: document.getElementById("library-batch-delete"),
  batchRelearn: document.getElementById("library-batch-relearn"),
  fileInput: document.getElementById("library-file-input"),
  dialog: document.getElementById("library-dialog"),
  form: document.getElementById("library-form"),
  dialogTitle: document.getElementById("library-dialog-title"),
  dialogSubmit: document.getElementById("library-dialog-submit"),
  formError: document.getElementById("library-form-error"),
  nameInput: document.getElementById("library-name"),
  descriptionInput: document.getElementById("library-description"),
  globalRow: document.getElementById("library-global-row"),
  globalAccess: document.getElementById("library-global-access"),
  initialFilesRow: document.getElementById("library-initial-files-row"),
  initialFiles: document.getElementById("library-initial-files"),
  confirmDialog: document.getElementById("library-confirm-dialog"),
  confirmTitle: document.getElementById("library-confirm-title"),
  confirmMessage: document.getElementById("library-confirm-message"),
  confirmSubmit: document.getElementById("library-confirm-submit"),
  learningDrawer: document.getElementById("library-learning-drawer"),
  learningTitle: document.getElementById("library-learning-title"),
  learningBody: document.getElementById("library-learning-body"),
};

const catalogCategories = [
  { id: "tables", label: "表", icon: "table-2" },
  { id: "knowledge", label: "知识库", icon: "book-copy" },
  { id: "requirements", label: "业务需求", icon: "clipboard-list" },
  { id: "solutions", label: "研发方案", icon: "workflow" },
  { id: "sql", label: "SQL", icon: "file-code-2" },
];
const libraryTags = ["指标维度", "开发规范", "ETL模板", "数据源画像", "质量规则", "其他"];

async function libraryApi(path, options = {}) {
  const url = new URL(path, window.location.origin);
  if (url.pathname.startsWith("/api/library/") && !url.searchParams.has("space_id")) {
    url.searchParams.set("space_id", activeSpaceId || "demo");
  }
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(`${url.pathname}${url.search}`, {
    headers: {
      "Content-Type": "application/json",
      "X-AIDW-Account": appState.selectedAccount,
      ...headers,
    },
    ...requestOptions,
  });
  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch (_error) {
      // Keep the HTTP fallback.
    }
    throw new Error(message);
  }
  return response.json();
}

function canManageLibraryBase(base = libraryState.activeBase) {
  return Boolean(base) && (!base.global_access || currentAccountUser?.role === "admin");
}

function libraryDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
}

function libraryEscape(value) {
  return escapeHtml(String(value ?? ""));
}

function libraryRefreshIcons() {
  refreshIcons();
}

function setLibraryMode(mode) {
  libraryState.mode = mode;
  document.querySelectorAll("[data-library-mode]").forEach((button) => {
    const active = button.dataset.libraryMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  libraryElements.catalogPanel.classList.toggle("is-hidden", mode !== "catalog");
  libraryElements.knowledgePanel.classList.toggle("is-hidden", mode !== "knowledge");
  if (mode === "catalog") loadLibraryCatalog();
  else loadLibraryBases();
  libraryRefreshIcons();
}

async function loadLibraryCatalog() {
  libraryElements.catalogDetailBody.innerHTML = '<div class="catalog-loading">正在加载目录...</div>';
  try {
    libraryState.catalog = await libraryApi("/api/library/catalog");
    renderCatalogTree();
    renderCatalogDetail();
  } catch (error) {
    libraryElements.catalogDetailBody.innerHTML = `<div class="catalog-loading">${libraryEscape(error.message)}</div>`;
  }
}

function catalogItems(categoryId) {
  const data = libraryState.catalog || {};
  return Array.isArray(data[categoryId]) ? data[categoryId] : [];
}

function catalogNodeKey(kind, id) {
  return `${kind}:${id}`;
}

function renderCatalogTree() {
  const query = libraryElements.catalogTreeSearch.value.trim().toLowerCase();
  const rows = [];
  catalogCategories.forEach((category) => {
    const allItems = catalogItems(category.id);
    const matchingItems = allItems.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
    const items = query ? matchingItems : allItems;
    if (query && !category.label.toLowerCase().includes(query) && !items.length) return;
    const key = catalogNodeKey("category", category.id);
    const expanded = query || libraryState.expanded.has(key);
    rows.push(catalogTreeRow("category", category.id, category.label, category.icon, items.length, 0, expanded, items.length > 0));
    if (!expanded) return;

    if (category.id === "tables") {
      const layers = [...new Set(items.map((item) => item.layer || "other"))];
      layers.forEach((layer) => {
        const layerItems = items.filter((item) => (item.layer || "other") === layer);
        const layerKey = catalogNodeKey("layer", layer);
        const layerOpen = query || libraryState.expanded.has(layerKey);
        rows.push(catalogTreeRow("layer", layer, layer.toUpperCase(), "layers-3", layerItems.length, 1, layerOpen, true));
        if (layerOpen) layerItems.forEach((item) => rows.push(catalogTreeRow("table", item.name, item.name, "table-2", null, 2, false, false)));
      });
    } else if (category.id === "knowledge") {
      items.forEach((base) => {
        const baseKey = catalogNodeKey("knowledge_base", base.id);
        const baseOpen = query || libraryState.expanded.has(baseKey);
        rows.push(catalogTreeRow("knowledge_base", base.id, base.name, "book-open", (base.files || []).length, 1, baseOpen, (base.files || []).length > 0));
        if (baseOpen) (base.files || []).filter((file) => !query || JSON.stringify(file).toLowerCase().includes(query)).forEach((file) => {
          rows.push(catalogTreeRow("knowledge_file", `${base.id}:${file.id}`, file.file_name, "file-text", null, 2, false, false));
        });
      });
    } else {
      const itemKind = category.id === "requirements" ? "requirement" : category.id === "solutions" ? "solution" : "sql";
      items.forEach((item) => rows.push(catalogTreeRow(itemKind, String(item.id || item.name), item.title || item.name || item.file_name || item.id, category.icon, null, 1, false, false)));
    }
  });
  libraryElements.catalogTree.innerHTML = rows.join("") || '<p class="empty-row">没有匹配的目录内容</p>';
  libraryElements.catalogTree.querySelectorAll("[data-catalog-kind]").forEach((button) => button.addEventListener("click", () => selectCatalogNode(button.dataset.catalogKind, button.dataset.catalogId, button.dataset.expandable === "true")));
  libraryRefreshIcons();
}

function catalogTreeRow(kind, id, label, iconName, count, depth, expanded, expandable) {
  const active = libraryState.catalogNode.kind === kind && libraryState.catalogNode.id === String(id);
  const chevron = expandable ? `<i class="tree-chevron ${expanded ? "is-open" : ""}" data-lucide="chevron-right"></i>` : '<span class="tree-spacer"></span>';
  return `<button class="catalog-tree-row ${active ? "is-active" : ""}" style="--depth:${depth}" type="button" data-catalog-kind="${libraryEscape(kind)}" data-catalog-id="${libraryEscape(id)}" data-expandable="${expandable}">${chevron}<i data-lucide="${iconName}"></i><span>${libraryEscape(label)}</span>${count === null ? "" : `<small>${count}</small>`}</button>`;
}

function selectCatalogNode(kind, id, expandable) {
  libraryState.catalogNode = { kind, id: String(id) };
  if (expandable) {
    const key = catalogNodeKey(kind, id);
    if (libraryState.expanded.has(key)) libraryState.expanded.delete(key);
    else libraryState.expanded.add(key);
  }
  renderCatalogTree();
  renderCatalogDetail();
}

function findCatalogNode() {
  const { kind, id } = libraryState.catalogNode;
  if (kind === "category") return catalogCategories.find((item) => item.id === id);
  if (kind === "layer") return { name: id, label: id.toUpperCase(), items: catalogItems("tables").filter((item) => item.layer === id) };
  if (kind === "table") return catalogItems("tables").find((item) => item.name === id);
  if (kind === "knowledge_base") return catalogItems("knowledge").find((item) => item.id === id);
  if (kind === "knowledge_file") {
    const [baseId, fileId] = id.split(":");
    const base = catalogItems("knowledge").find((item) => item.id === baseId);
    const file = (base?.files || []).find((item) => item.id === fileId);
    return file ? { ...file, base } : null;
  }
  const category = kind === "requirement" ? "requirements" : kind === "solution" ? "solutions" : "sql";
  return catalogItems(category).find((item) => String(item.id || item.name) === id);
}

function renderCatalogDetail() {
  const node = findCatalogNode();
  const query = libraryElements.catalogDetailSearch.value.trim().toLowerCase();
  const category = libraryState.catalogNode.kind === "category"
    ? node
    : catalogCategories.find((item) => item.id === catalogCategoryForKind(libraryState.catalogNode.kind));
  libraryElements.catalogDetailTitle.textContent = libraryState.catalogNode.kind === "category" ? (category?.label || "目录") : (node?.display_name || node?.name || node?.title || node?.file_name || "目录项");
  libraryElements.catalogDetailPath.textContent = `${currentSpace()?.name || "当前空间"} / ${category?.label || "目录"}`;
  libraryElements.catalogDetailIcon.innerHTML = icon(category?.icon || "file-text");
  if (!node) {
    libraryElements.catalogDetailBody.innerHTML = '<div class="catalog-loading">目录项不存在</div>';
  } else if (libraryState.catalogNode.kind === "category") {
    renderCatalogCategory(node.id, query);
  } else if (libraryState.catalogNode.kind === "layer") {
    renderCatalogTableList(node.items, query);
  } else if (libraryState.catalogNode.kind === "table") {
    renderCatalogTableNode(node, query);
  } else if (libraryState.catalogNode.kind === "knowledge_base") {
    renderCatalogKnowledgeBase(node, query);
  } else if (libraryState.catalogNode.kind === "knowledge_file") {
    renderCatalogKnowledgeFile(node);
  } else if (["requirement", "solution", "sql"].includes(libraryState.catalogNode.kind)) {
    renderCatalogDocument(node);
  }
  wireCatalogDetailRows();
  libraryRefreshIcons();
}

function catalogCategoryForKind(kind) {
  if (["layer", "table"].includes(kind)) return "tables";
  if (["knowledge_base", "knowledge_file"].includes(kind)) return "knowledge";
  if (kind === "requirement") return "requirements";
  if (kind === "solution") return "solutions";
  return "sql";
}

function renderCatalogCategory(categoryId, query) {
  const items = catalogItems(categoryId).filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  if (!items.length) {
    libraryElements.catalogDetailBody.innerHTML = '<div class="catalog-loading">当前分类暂无内容</div>';
    return;
  }
  if (categoryId === "tables") renderCatalogTableList(items, "");
  else if (categoryId === "knowledge") {
    const rows = items.map((item) => [item.name, item.file_count || 0, item.description || "-", libraryDate(item.updated_at)]);
    libraryElements.catalogDetailBody.innerHTML = catalogTableHtml(["知识库名称", "文件数", "描述信息", "更新时间"], rows, items.map((item) => ["knowledge_base", item.id]));
  } else {
    const rows = items.map((item) => [item.title || item.name || item.file_name || item.id, item.status || item.requirement_title || "-", libraryDate(item.updated_at)]);
    const kind = categoryId === "requirements" ? "requirement" : categoryId === "solutions" ? "solution" : "sql";
    libraryElements.catalogDetailBody.innerHTML = catalogTableHtml(["名称", "来源/状态", "更新时间"], rows, items.map((item) => [kind, item.id || item.name]));
  }
}

function renderCatalogTableList(items, query) {
  const filtered = items.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const rows = filtered.map((item) => [item.name, item.schema_name, item.layer.toUpperCase(), item.comment || "-", (item.columns || []).length]);
  libraryElements.catalogDetailBody.innerHTML = catalogTableHtml(["名称", "Schema", "分层", "描述信息", "字段数"], rows, filtered.map((item) => ["table", item.name]));
}

function catalogTableHtml(columns, rows, selections = []) {
  return `<table class="catalog-table"><thead><tr>${columns.map((column) => `<th>${libraryEscape(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row, index) => {
    const selection = selections[index];
    const attrs = selection ? ` data-catalog-select="true" data-kind="${libraryEscape(selection[0])}" data-id="${libraryEscape(selection[1])}"` : "";
    return `<tr${attrs}>${row.map((value) => `<td>${libraryEscape(value)}</td>`).join("")}</tr>`;
  }).join("")}</tbody></table>`;
}

function renderCatalogTableNode(table, query) {
  const fields = (table.columns || []).filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const summary = `<div class="catalog-summary"><div><small>完整表名</small><strong>${libraryEscape(`${table.catalog}.${table.schema_name}.${table.name}`)}</strong></div><div><small>数仓分层</small><strong>${libraryEscape(table.layer.toUpperCase())}</strong></div><div><small>字段数量</small><strong>${fields.length}</strong></div><div><small>说明</small><strong>${libraryEscape(table.comment || "-")}</strong></div></div>`;
  libraryElements.catalogDetailBody.innerHTML = summary + catalogTableHtml(["字段名称", "类型", "描述信息"], fields.map((field) => [field.name, field.type, field.comment || "-"]));
}

function renderCatalogKnowledgeBase(base, query) {
  const files = (base.files || []).filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const summary = `<div class="catalog-summary"><div><small>知识库</small><strong>${libraryEscape(base.name)}</strong></div><div><small>文件数量</small><strong>${files.length}</strong></div><div><small>浏览量</small><strong>${base.views || 0}</strong></div><div><small>使用次数</small><strong>${base.uses || 0}</strong></div></div>`;
  libraryElements.catalogDetailBody.innerHTML = summary + catalogTableHtml(["文件名称", "学习状态", "标签", "分块数", "更新时间"], files.map((file) => [file.file_name, libraryStatusLabel(file.status), file.tag || "-", file.chunk_count || 0, libraryDate(file.updated_at)]), files.map((file) => ["knowledge_file", `${base.id}:${file.id}`]));
}

function renderCatalogKnowledgeFile(file) {
  libraryElements.catalogDetailBody.innerHTML = `<div class="catalog-summary"><div><small>文件名称</small><strong>${libraryEscape(file.file_name)}</strong></div><div><small>所属知识库</small><strong>${libraryEscape(file.base.name)}</strong></div><div><small>学习状态</small><strong>${libraryEscape(libraryStatusLabel(file.status))}</strong></div><div><small>标签</small><strong>${libraryEscape(file.tag || "-")}</strong></div></div><div class="catalog-document"><p>${libraryEscape(file.summary || file.error || "暂无摘要")}</p><button class="command-button" type="button" data-open-learning="${libraryEscape(file.base.id)}:${libraryEscape(file.id)}">${icon("scan-text")}<span>查看学习详情</span></button></div>`;
  libraryElements.catalogDetailBody.querySelector("[data-open-learning]")?.addEventListener("click", () => openLearningDetail(file.base.id, file.id));
}

async function renderCatalogDocument(item) {
  const summary = `<div class="catalog-summary"><div><small>名称</small><strong>${libraryEscape(item.title || item.name || item.file_name || item.id)}</strong></div><div><small>来源需求</small><strong>${libraryEscape(item.requirement_title || item.id || "-")}</strong></div><div><small>更新时间</small><strong>${libraryEscape(libraryDate(item.updated_at))}</strong></div></div>`;
  libraryElements.catalogDetailBody.innerHTML = summary + '<div class="catalog-loading">正在读取内容...</div>';
  if (!item.content_url) {
    libraryElements.catalogDetailBody.innerHTML = summary + `<div class="catalog-document"><p>${libraryEscape(item.status || "暂无可预览内容")}</p></div>`;
    return;
  }
  try {
    const payload = await libraryApi(item.content_url);
    if (findCatalogNode()?.id !== item.id) return;
    libraryElements.catalogDetailBody.innerHTML = summary + `<div class="catalog-document markdown-content">${markdownToHtml(payload.content || "")}</div>`;
  } catch (error) {
    libraryElements.catalogDetailBody.innerHTML = summary + `<div class="catalog-loading">${libraryEscape(error.message)}</div>`;
  }
}

function wireCatalogDetailRows() {
  libraryElements.catalogDetailBody.querySelectorAll("[data-catalog-select]").forEach((row) => row.addEventListener("click", () => selectCatalogNode(row.dataset.kind, row.dataset.id, false)));
}

async function loadLibraryBases(activeId = "") {
  try {
    libraryState.bases = await libraryApi("/api/library/bases");
    if (activeId) libraryState.activeBase = libraryState.bases.find((item) => item.id === activeId) || libraryState.activeBase;
    renderLibraryGrid();
    if (libraryState.activeBase && !libraryElements.baseDetail.classList.contains("is-hidden")) renderLibraryDetail();
  } catch (error) {
    libraryElements.grid.innerHTML = `<p class="empty-row">${libraryEscape(error.message)}</p>`;
  }
}

function renderLibraryGrid() {
  const query = libraryElements.search.value.trim().toLowerCase();
  const bases = libraryState.bases.filter((item) => !query || `${item.name} ${item.description}`.toLowerCase().includes(query));
  libraryElements.grid.innerHTML = bases.map((base) => `<button class="library-base-card" type="button" data-library-base="${libraryEscape(base.id)}">${icon("book-open")}<span><strong>${libraryEscape(base.name)}</strong><p>${libraryEscape(base.description || "暂无描述")}</p>${base.global_access ? '<span class="library-scope-badge">全局共享</span>' : ""}<small>${base.file_count || 0} 个文件 · 更新于 ${libraryEscape(libraryDate(base.updated_at))}</small></span><i class="card-arrow" data-lucide="chevron-right"></i></button>`).join("") || `<div class="library-empty">${icon(query ? "search-x" : "book-open")}<strong>${query ? "没有匹配的知识库" : "还没有业务知识库"}</strong><small>${query ? "调整搜索关键词后重试" : "新建知识库并上传业务文档"}</small></div>`;
  libraryElements.grid.querySelectorAll("[data-library-base]").forEach((button) => button.addEventListener("click", () => openLibraryBase(button.dataset.libraryBase)));
  libraryRefreshIcons();
}

async function openLibraryBase(baseId) {
  try {
    const viewed = await libraryApi(`/api/library/bases/${encodeURIComponent(baseId)}/view`, { method: "POST", body: "{}" });
    libraryState.activeBase = viewed;
    libraryState.files = await libraryApi(`/api/library/bases/${encodeURIComponent(baseId)}/files`);
    libraryState.selectedFiles.clear();
    libraryElements.baseBrowser.classList.add("is-hidden");
    libraryElements.baseDetail.classList.remove("is-hidden");
    renderLibraryDetail();
  } catch (error) {
    showToast(error.message);
  }
}

function closeLibraryBase() {
  libraryState.activeBase = null;
  libraryState.files = [];
  libraryState.selectedFiles.clear();
  libraryElements.baseDetail.classList.add("is-hidden");
  libraryElements.baseBrowser.classList.remove("is-hidden");
  loadLibraryBases();
}

function renderLibraryDetail() {
  const base = libraryState.activeBase;
  if (!base) return;
  const manageable = canManageLibraryBase(base);
  libraryElements.detailName.textContent = base.name;
  libraryElements.detailDescription.textContent = base.description || "暂无描述";
  libraryElements.detailMeta.innerHTML = `${base.global_access ? '<span class="library-scope-badge">全局共享</span>' : `<span>所属空间 ${libraryEscape(currentSpace()?.name || base.workspace_id || "-")}</span>`}<span>创建于 ${libraryEscape(libraryDate(base.created_at))}</span><span>更新于 ${libraryEscape(libraryDate(base.updated_at))}</span><span>创建人 ${libraryEscape(base.owner || "demo.user")}</span>`;
  document.getElementById("library-edit").hidden = !manageable;
  document.getElementById("library-delete").hidden = !manageable;
  document.getElementById("library-add-files").hidden = !manageable;
  libraryElements.batchDelete.hidden = !manageable;
  libraryElements.batchRelearn.hidden = !manageable;
  libraryElements.selectAll.disabled = !manageable;
  libraryElements.stats.innerHTML = `<div><span>浏览量</span><strong>${base.views || 0}<small>次</small></strong></div><div><span>使用次数</span><strong>${base.uses || 0}<small>次</small></strong></div><div><span>文件个数</span><strong>${libraryState.files.length}<small>个</small></strong></div>`;
  renderLibraryFiles();
}

function renderLibraryFiles() {
  const query = libraryElements.fileSearch.value.trim().toLowerCase();
  const files = libraryState.files.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const manageable = canManageLibraryBase();
  libraryElements.fileBody.innerHTML = files.map((file) => {
    const selected = libraryState.selectedFiles.has(file.id);
    return `<tr><td><input type="checkbox" data-library-file-check="${libraryEscape(file.id)}" ${selected ? "checked" : ""} ${manageable ? "" : "disabled"} aria-label="选择 ${libraryEscape(file.file_name)}"></td><td><button class="library-file-name" type="button" data-library-file-detail="${libraryEscape(file.id)}">${libraryEscape(file.file_name)}</button></td><td><span class="library-status ${libraryEscape(file.status)}">${libraryEscape(libraryStatusLabel(file.status))}</span></td><td>${libraryEscape((file.file_name.split(".").pop() || "-").toUpperCase())}</td><td><select class="library-tag-select" data-library-file-tag="${libraryEscape(file.id)}" ${manageable ? "" : "disabled"}>${libraryTags.map((tag) => `<option ${file.tag === tag ? "selected" : ""}>${tag}</option>`).join("")}</select></td><td title="${libraryEscape(file.summary || file.error || "")}">${libraryEscape(file.summary || file.error || "-")}</td><td>${libraryEscape(libraryDate(file.updated_at))}</td><td><span class="library-file-actions"><button class="icon-button" type="button" data-library-file-detail="${libraryEscape(file.id)}" aria-label="学习详情" title="学习详情">${icon("scan-text")}</button>${manageable ? `<button class="icon-button" type="button" data-library-file-relearn="${libraryEscape(file.id)}" aria-label="重新学习" title="重新学习">${icon("refresh-cw")}</button>` : ""}<button class="icon-button" type="button" data-library-file-download="${libraryEscape(file.id)}" aria-label="下载" title="下载">${icon("download")}</button>${manageable ? `<button class="icon-button danger" type="button" data-library-file-delete="${libraryEscape(file.id)}" aria-label="删除" title="删除">${icon("trash-2")}</button>` : ""}</span></td></tr>`;
  }).join("") || '<tr><td colspan="8" class="empty-row">暂无知识文件</td></tr>';
  libraryElements.fileFooter.textContent = `共 ${files.length} 条数据`;
  libraryElements.selectAll.checked = Boolean(files.length) && files.every((file) => libraryState.selectedFiles.has(file.id));
  libraryElements.selectAll.indeterminate = files.some((file) => libraryState.selectedFiles.has(file.id)) && !libraryElements.selectAll.checked;
  syncLibraryBatchActions();
  wireLibraryFileActions();
  libraryRefreshIcons();
}

function libraryStatusLabel(status) {
  return { processing: "学习中", learned: "已学习", failed: "学习失败" }[status] || status || "未知";
}

function wireLibraryFileActions() {
  libraryElements.fileBody.querySelectorAll("[data-library-file-check]").forEach((input) => input.addEventListener("change", () => {
    if (input.checked) libraryState.selectedFiles.add(input.dataset.libraryFileCheck);
    else libraryState.selectedFiles.delete(input.dataset.libraryFileCheck);
    renderLibraryFiles();
  }));
  libraryElements.fileBody.querySelectorAll("[data-library-file-detail]").forEach((button) => button.addEventListener("click", () => openLearningDetail(libraryState.activeBase.id, button.dataset.libraryFileDetail)));
  libraryElements.fileBody.querySelectorAll("[data-library-file-relearn]").forEach((button) => button.addEventListener("click", () => relearnLibraryFiles([button.dataset.libraryFileRelearn])));
  libraryElements.fileBody.querySelectorAll("[data-library-file-download]").forEach((button) => button.addEventListener("click", () => downloadLibraryFile(button.dataset.libraryFileDownload)));
  libraryElements.fileBody.querySelectorAll("[data-library-file-delete]").forEach((button) => button.addEventListener("click", () => confirmDeleteLibraryFiles([button.dataset.libraryFileDelete])));
  libraryElements.fileBody.querySelectorAll("[data-library-file-tag]").forEach((select) => select.addEventListener("change", () => updateLibraryFileTag(select.dataset.libraryFileTag, select.value)));
}

function syncLibraryBatchActions() {
  const disabled = libraryState.selectedFiles.size === 0;
  libraryElements.batchDelete.disabled = disabled;
  libraryElements.batchRelearn.disabled = disabled;
}

function openLibraryDialog(mode) {
  if (mode === "edit" && !canManageLibraryBase()) return;
  libraryState.dialogMode = mode;
  libraryElements.form.reset();
  libraryElements.formError.textContent = "";
  const editing = mode === "edit";
  const admin = currentAccountUser?.role === "admin";
  libraryElements.dialogTitle.textContent = editing ? "编辑知识库" : "新建知识库";
  libraryElements.dialogSubmit.textContent = editing ? "保存" : "创建";
  libraryElements.initialFilesRow.classList.toggle("is-hidden", editing);
  libraryElements.globalRow.hidden = !admin;
  libraryElements.globalAccess.checked = Boolean(editing && libraryState.activeBase?.global_access);
  if (editing && libraryState.activeBase) {
    libraryElements.nameInput.value = libraryState.activeBase.name;
    libraryElements.descriptionInput.value = libraryState.activeBase.description || "";
  }
  libraryElements.dialog.showModal();
  libraryElements.nameInput.focus();
}

async function submitLibraryForm(event) {
  event.preventDefault();
  const name = libraryElements.nameInput.value.trim();
  const description = libraryElements.descriptionInput.value.trim();
  libraryElements.formError.textContent = "";
  libraryElements.dialogSubmit.disabled = true;
  try {
    const payload = {
      name,
      description,
      owner: document.getElementById("account-name")?.textContent || "demo.user",
      space_id: activeSpaceId,
      global_access: currentAccountUser?.role === "admin" && libraryElements.globalAccess.checked,
    };
    if (libraryState.dialogMode === "edit") {
      const updated = await libraryApi(`/api/library/bases/${encodeURIComponent(libraryState.activeBase.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      libraryState.activeBase = updated;
      libraryElements.dialog.close();
      renderLibraryDetail();
      showToast("知识库已更新");
    } else {
      const created = await libraryApi("/api/library/bases", { method: "POST", body: JSON.stringify(payload) });
      const files = [...(libraryElements.initialFiles.files || [])];
      libraryElements.dialog.close();
      if (files.length) await uploadLibraryFiles(created.id, files);
      await loadLibraryBases();
      await openLibraryBase(created.id);
      showToast("知识库已创建");
    }
  } catch (error) {
    libraryElements.formError.textContent = error.message;
  } finally {
    libraryElements.dialogSubmit.disabled = false;
  }
}

function openLibraryConfirm(title, message, action) {
  libraryElements.confirmTitle.textContent = title;
  libraryElements.confirmMessage.textContent = message;
  libraryState.confirmAction = action;
  libraryElements.confirmDialog.showModal();
}

async function runLibraryConfirm() {
  if (!libraryState.confirmAction) return;
  libraryElements.confirmSubmit.disabled = true;
  try {
    await libraryState.confirmAction();
    libraryElements.confirmDialog.close();
  } catch (error) {
    showToast(error.message);
  } finally {
    libraryState.confirmAction = null;
    libraryElements.confirmSubmit.disabled = false;
  }
}

function confirmDeleteLibraryBase() {
  const base = libraryState.activeBase;
  if (!base) return;
  openLibraryConfirm("删除知识库", `确定删除“${base.name}”吗？文件和学习内容会移入可恢复区。`, async () => {
    await libraryApi(`/api/library/bases/${encodeURIComponent(base.id)}`, { method: "DELETE" });
    closeLibraryBase();
    showToast("知识库已移入可恢复区");
  });
}

function confirmDeleteLibraryFiles(fileIds) {
  if (!libraryState.activeBase || !fileIds.length) return;
  openLibraryConfirm("删除知识文件", `确定删除选中的 ${fileIds.length} 个文件吗？文件会移入可恢复区。`, async () => {
    for (const fileId of fileIds) await libraryApi(`/api/library/bases/${encodeURIComponent(libraryState.activeBase.id)}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
    await refreshActiveLibraryBase();
    showToast("知识文件已移入可恢复区");
  });
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) binary += String.fromCharCode(...bytes.subarray(index, index + size));
  return btoa(binary);
}

async function uploadLibraryFiles(baseId, files) {
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} 超过 20MB`);
    showToast(`正在学习 ${file.name}`);
    const contentBase64 = await fileToBase64(file);
    await libraryApi(`/api/library/bases/${encodeURIComponent(baseId)}/files`, { method: "POST", body: JSON.stringify({ file_name: file.name, content_base64: contentBase64 }) });
  }
}

async function downloadLibraryFile(fileId) {
  const baseId = libraryState.activeBase?.id;
  const file = libraryState.files.find((item) => item.id === fileId);
  if (!baseId || !file) return;
  const url = new URL(`/api/library/bases/${encodeURIComponent(baseId)}/files/${encodeURIComponent(fileId)}/download`, window.location.origin);
  url.searchParams.set("space_id", activeSpaceId || "demo");
  try {
    const response = await fetch(`${url.pathname}${url.search}`, {
      headers: { "X-AIDW-Account": appState.selectedAccount },
    });
    if (!response.ok) {
      let message = `下载失败 (${response.status})`;
      try { message = (await response.json()).detail || message; } catch (_error) { /* Keep fallback. */ }
      throw new Error(message);
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = file.file_name;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshActiveLibraryBase() {
  const baseId = libraryState.activeBase?.id;
  if (!baseId) return;
  const [bases, files] = await Promise.all([libraryApi("/api/library/bases"), libraryApi(`/api/library/bases/${encodeURIComponent(baseId)}/files`)]);
  libraryState.bases = bases;
  libraryState.activeBase = bases.find((item) => item.id === baseId) || libraryState.activeBase;
  libraryState.files = files;
  libraryState.selectedFiles.clear();
  renderLibraryDetail();
}

async function handleLibraryFileInput(files) {
  if (!libraryState.activeBase || !files.length) return;
  try {
    await uploadLibraryFiles(libraryState.activeBase.id, files);
    await refreshActiveLibraryBase();
    showToast("知识文件学习完成");
  } catch (error) {
    showToast(error.message);
    await refreshActiveLibraryBase();
  }
}

async function relearnLibraryFiles(fileIds) {
  if (!libraryState.activeBase || !fileIds.length) return;
  try {
    for (const fileId of fileIds) {
      showToast("正在重新学习文件");
      await libraryApi(`/api/library/bases/${encodeURIComponent(libraryState.activeBase.id)}/files/${encodeURIComponent(fileId)}/relearn`, { method: "POST", body: "{}" });
    }
    await refreshActiveLibraryBase();
    showToast("重新学习完成");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateLibraryFileTag(fileId, tag) {
  try {
    await libraryApi(`/api/library/bases/${encodeURIComponent(libraryState.activeBase.id)}/files/${encodeURIComponent(fileId)}/tag`, { method: "PATCH", body: JSON.stringify({ tag }) });
    await refreshActiveLibraryBase();
    showToast("标签已更新");
  } catch (error) {
    showToast(error.message);
  }
}

async function openLearningDetail(baseId, fileId) {
  libraryElements.learningDrawer.hidden = false;
  libraryElements.learningBody.innerHTML = '<div class="catalog-loading">正在读取学习详情...</div>';
  try {
    const detail = await libraryApi(`/api/library/bases/${encodeURIComponent(baseId)}/files/${encodeURIComponent(fileId)}`);
    libraryElements.learningTitle.textContent = detail.file.file_name;
    const stages = (detail.file.stages || []).map((stage) => `<div class="learning-stage"><span>${icon(stage.status === "completed" ? "check" : stage.status === "failed" ? "x" : "loader-circle")}</span><span><strong>${libraryEscape(stage.name)}</strong><small>${libraryEscape(stage.detail || libraryStatusLabel(stage.status))}</small></span><small>${libraryEscape(libraryDate(stage.completed_at || stage.started_at))}</small></div>`).join("");
    const outputs = (detail.stage_outputs || []).map((output) => {
      const content = output.content || JSON.stringify(output.items || [], null, 2);
      const name = (detail.file.stages || []).find((stage) => stage.key === output.key)?.name || output.key;
      return `<section class="learning-output"><h3>${libraryEscape(name)}</h3><pre>${libraryEscape(content)}</pre></section>`;
    }).join("");
    libraryElements.learningBody.innerHTML = `<div class="learning-stage-list">${stages}</div>${outputs || '<p class="empty-row">暂无学习输出</p>'}`;
    libraryRefreshIcons();
  } catch (error) {
    libraryElements.learningBody.innerHTML = `<div class="catalog-loading">${libraryEscape(error.message)}</div>`;
  }
}

function closeLearningDetail() {
  libraryElements.learningDrawer.hidden = true;
}

document.querySelector(".nav-button[data-view='library']")?.addEventListener("click", () => setLibraryMode(libraryState.mode));
document.querySelectorAll("[data-library-mode]").forEach((button) => button.addEventListener("click", () => setLibraryMode(button.dataset.libraryMode)));
document.getElementById("catalog-refresh").addEventListener("click", loadLibraryCatalog);
document.getElementById("catalog-refresh-head")?.addEventListener("click", loadLibraryCatalog);
libraryElements.catalogTreeSearch.addEventListener("input", renderCatalogTree);
libraryElements.catalogDetailSearch.addEventListener("input", renderCatalogDetail);
libraryElements.search.addEventListener("input", renderLibraryGrid);
libraryElements.fileSearch.addEventListener("input", renderLibraryFiles);
document.getElementById("library-create").addEventListener("click", () => openLibraryDialog("create"));
document.getElementById("library-detail-back").addEventListener("click", closeLibraryBase);
document.getElementById("library-edit").addEventListener("click", () => openLibraryDialog("edit"));
document.getElementById("library-delete").addEventListener("click", confirmDeleteLibraryBase);
document.getElementById("library-add-files").addEventListener("click", () => libraryElements.fileInput.click());
libraryElements.fileInput.addEventListener("change", () => {
  const files = [...(libraryElements.fileInput.files || [])];
  libraryElements.fileInput.value = "";
  handleLibraryFileInput(files);
});
libraryElements.selectAll.addEventListener("change", () => {
  libraryState.selectedFiles.clear();
  if (libraryElements.selectAll.checked) libraryState.files.forEach((file) => libraryState.selectedFiles.add(file.id));
  renderLibraryFiles();
});
libraryElements.batchDelete.addEventListener("click", () => confirmDeleteLibraryFiles([...libraryState.selectedFiles]));
libraryElements.batchRelearn.addEventListener("click", () => relearnLibraryFiles([...libraryState.selectedFiles]));
libraryElements.form.addEventListener("submit", submitLibraryForm);
document.getElementById("library-dialog-close").addEventListener("click", () => libraryElements.dialog.close());
document.getElementById("library-dialog-cancel").addEventListener("click", () => libraryElements.dialog.close());
libraryElements.confirmSubmit.addEventListener("click", runLibraryConfirm);
document.getElementById("library-confirm-close").addEventListener("click", () => libraryElements.confirmDialog.close());
document.getElementById("library-confirm-cancel").addEventListener("click", () => libraryElements.confirmDialog.close());
document.getElementById("library-learning-close").addEventListener("click", closeLearningDetail);
document.getElementById("library-learning-backdrop").addEventListener("click", closeLearningDetail);
document.addEventListener("aidw:space-changed", () => {
  libraryState.activeBase = null;
  libraryState.files = [];
  libraryState.selectedFiles.clear();
  libraryElements.baseDetail.classList.add("is-hidden");
  libraryElements.baseBrowser.classList.remove("is-hidden");
  closeLearningDetail();
  libraryState.catalog = null;
  libraryState.catalogNode = { kind: "category", id: "tables" };
  if (!libraryElements.knowledgePanel.classList.contains("is-hidden")) loadLibraryBases();
  if (libraryElements.view.classList.contains("is-active") && libraryState.mode === "catalog") loadLibraryCatalog();
});
