(() => {
  "use strict";

  const state = {
    loaded: false,
    skills: [],
    query: "",
    current: null,
    files: [],
    currentFile: null,
    draft: "",
    dirty: false,
    fileMode: "preview",
    suggestion: null,
    importFiles: [],
    importFilename: "",
    conversationId: "",
    bindings: [],
    versionCache: {},
    pickerSkillId: "",
    pickerQuery: "",
    versionViewMode: "changes",
    selectedVersionFile: "",
    selectedSnapshotFile: "",
    deleteSkillId: "",
    account: "demo.user",
    spaceId: "demo",
    reviewers: [],
  };

  const $ = (id) => document.getElementById(id);
  const refs = {
    browser: $("skills-browser"), editor: $("skill-editor"), list: $("custom-skill-list"),
    search: $("skill-search"), editorTitle: $("skill-editor-title"), editorDescription: $("skill-editor-description"),
    editorStatus: $("skill-editor-status"), fileTree: $("skill-file-tree"), fileName: $("skill-file-name"),
    fileMeta: $("skill-file-meta"), fileStatus: $("skill-file-status"), filePreview: $("skill-file-preview"), fileInput: $("skill-file-input"),
    fileSave: $("skill-file-save"), historyButton: $("skill-history-open"), publishButton: $("skill-publish"), deleteButton: $("skill-delete"), metadataButton: $("skill-metadata-open"),
    exportButton: $("skill-export"),
    aiInstruction: $("skill-ai-instruction"), aiEmpty: $("skill-ai-empty"), aiReview: $("skill-ai-review"),
    aiSummary: $("skill-ai-summary"), aiDiff: $("skill-ai-diff"), importDialog: $("skill-import-dialog"),
    importForm: $("skill-import-form"), importDropzone: $("skill-import-dropzone"), importSelection: $("skill-import-selection"),
    importSubmit: $("skill-import-submit"), importError: $("skill-import-error"), importFile: $("custom-skill-file"),
    metadataDialog: $("skill-metadata-dialog"), metadataForm: $("skill-metadata-form"), metadataHeading: $("skill-metadata-heading"),
    metadataTitle: $("skill-metadata-title"), metadataName: $("skill-metadata-name"), metadataDescription: $("skill-metadata-description"),
    metadataError: $("skill-metadata-error"), metadataSubmitLabel: $("skill-metadata-submit-label"), context: $("skill-context"),
    contextItems: $("skill-context-items"), addButton: $("custom-skill-add"), reviewFeedback: $("skill-review-feedback"),
    publishDialog: $("skill-publish-dialog"), publishForm: $("skill-publish-form"), publishVersion: $("skill-publish-version"),
    publishNotes: $("skill-publish-notes"), publishReviewer: $("skill-publish-reviewer"), publishSubtitle: $("skill-publish-subtitle"), publishChangeCount: $("skill-publish-change-count"),
    publishChanges: $("skill-publish-changes"), publishError: $("skill-publish-error"), versionDrawer: $("skill-version-drawer"),
    versionTitle: $("skill-version-title"), versionList: $("skill-version-list"), versionDetail: $("skill-version-detail"),
    pickerButton: $("skill-picker-button"), pickerButtonLabel: $("skill-picker-button-label"), pickerMenu: $("skill-picker-menu"),
    pickerSearch: $("skill-picker-search"), pickerList: $("skill-picker-list"), pickerVersionList: $("skill-picker-version-list"),
    pickerClear: $("skill-picker-clear"), pickerDone: $("skill-picker-done"), pickerSummary: $("skill-picker-summary"),
    deleteDialog: $("skill-delete-dialog"), deleteName: $("skill-delete-name"), deleteError: $("skill-delete-error"),
    deleteConfirm: $("skill-delete-confirm"),
  };

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function icon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
  function refreshIcons() { window.lucide?.createIcons({ attrs: { width: 16, height: 16, "aria-hidden": "true" } }); }
  function toast(message) {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2400);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", "X-AIDW-Account": state.account, ...(options.headers || {}) } });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `请求失败 (${response.status})`);
    }
    return response.json();
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function markdown(value) {
    let output = escapeHtml(value || "");
    output = output.replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>");
    output = output.replace(/```([^\n]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    output = output.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/^[-*] (.+)$/gm, "<li>$1</li>").replace(/(?:<li>.*<\/li>\n?)+/g, (items) => `<ul>${items}</ul>`);
    return output.split(/\n{2,}/).map((part) => /^<(?:h\d|pre|ul)/.test(part) ? part : `<p>${part.replaceAll("\n", "<br>")}</p>`).join("");
  }

  function statusLabel(skill) {
    if (skill.publish_status === "reviewing") return ["审核中", "reviewing"];
    if (skill.last_review_status === "rejected") return ["审核驳回", "rejected"];
    if (skill.publish_status === "pending_publish") return ["待发布", "pending"];
    return ["已发布", "published"];
  }

  function updateSkillState() {
    if (!state.current) return;
    const [status] = statusLabel(state.current);
    const version = state.current.publish_status === "reviewing" ? state.current.pending_version || state.current.version || "未发布" : state.current.version || "未发布";
    refs.editorStatus.textContent = `${version} · ${status}`;
    refs.publishButton.disabled = state.current.kind === "platform" || state.dirty || ["published", "reviewing"].includes(state.current.publish_status);
    refs.publishButton.title = state.dirty ? "请先保存当前文件到草稿" : state.current.publish_status === "published" ? "当前草稿与已发布版本一致" : state.current.publish_status === "reviewing" ? "当前版本正在等待审核" : "提交当前 Skill 草稿进行发布审核";
    refs.publishButton.querySelector("span").textContent = state.current.publish_status === "reviewing" ? "审核中" : "提交审核";
    const reviewing = state.current.publish_status === "reviewing";
    const rejected = state.current.last_review_status === "rejected" && state.current.last_review_reason;
    refs.reviewFeedback.hidden = !reviewing && !rejected;
    refs.editor.classList.toggle("has-review-feedback", reviewing || Boolean(rejected));
    refs.reviewFeedback.className = `skill-review-feedback${rejected && !reviewing ? " is-rejected" : ""}`;
    refs.reviewFeedback.innerHTML = reviewing
      ? `${icon("clock-3")}<span><strong>${escapeHtml(state.current.pending_version || "当前版本")} 已提交审核</strong><small>指定审核人通过后才会正式发布</small></span>`
      : rejected ? `${icon("circle-x")}<span><strong>${escapeHtml(state.current.last_review_version || "发布申请")} 已驳回</strong><small>${escapeHtml(state.current.last_review_reason)}</small></span>` : "";
    refreshIcons();
  }

  function cardDescription(value) {
    const characters = Array.from(String(value || ""));
    return characters.length > 40 ? `${characters.slice(0, 40).join("")}…` : characters.join("");
  }

  function skillCard(skill) {
    const [status, statusClass] = statusLabel(skill);
    const enabled = skill.enabled !== false;
    return `<article class="skill-card${enabled ? "" : " is-disabled"}" data-skill-id="${escapeHtml(skill.id)}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(skill.title)}">
      <div class="skill-card-actions"><span class="skill-status ${statusClass}">${status}</span><button class="skill-enabled-switch" type="button" role="switch" aria-checked="${enabled}" aria-label="${enabled ? "停用" : "启用"} ${escapeHtml(skill.title)}" title="${enabled ? "停用 Skill" : "启用 Skill"}" data-skill-toggle="${escapeHtml(skill.id)}"><span aria-hidden="true"></span></button></div>
      <div class="skill-card-head"><span class="skill-card-icon">${icon("shield-check")}</span>
      <div class="skill-card-copy"><strong title="${escapeHtml(skill.title)}">${escapeHtml(skill.title)}</strong><p title="${escapeHtml(skill.description)}">${escapeHtml(cardDescription(skill.description))}</p>
      <div class="skill-card-info"><div class="skill-card-details"><span title="归属">${icon("user-round")}<span>${escapeHtml(skill.owner || "demo.user")}</span></span><span title="版本">${icon("tag")}<span>${escapeHtml(skill.publish_status === "reviewing" ? skill.pending_version || skill.version || "未发布" : skill.version || "未发布")}</span></span><span title="更新时间">${icon("clock-3")}<span>${escapeHtml(formatDate(skill.updated_at))}</span></span></div></div></div></div>
    </article>`;
  }

  function renderSkills() {
    const query = state.query.toLowerCase();
    const filtered = state.skills.filter((skill) => `${skill.title} ${skill.name} ${skill.description}`.toLowerCase().includes(query));
    refs.list.innerHTML = filtered.length ? filtered.map(skillCard).join("") : '<div class="skill-empty">没有匹配的 Skill</div>';
    refreshIcons();
  }

  async function loadSkills(force = false) {
    if (state.loaded && !force) { renderSkills(); return; }
    refs.list.innerHTML = '<div class="skill-empty">正在加载 Skills...</div>';
    try {
      const skills = await api("/api/custom-skills");
      state.skills = Array.isArray(skills) ? skills : (skills.items || []);
      state.loaded = true;
      await hydrateBindings();
      renderSkills();
      renderContext();
      renderPickerList();
    } catch (error) {
      refs.list.innerHTML = `<div class="skill-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  async function setSkillEnabled(id, enabled) {
    const skill = state.skills.find((item) => item.id === id);
    if (!skill || (skill.enabled !== false) === enabled) return;
    try {
      const updated = await api(`/api/custom-skills/${encodeURIComponent(id)}/enabled`, {
        method: "PATCH", body: JSON.stringify({ enabled }),
      });
      Object.assign(skill, updated);
      if (!enabled) state.bindings = state.bindings.filter((item) => item.skill_id !== id);
      renderSkills(); renderPickerList(); renderPickerVersions(); renderContext();
      toast(`${skill.title} 已${enabled ? "启用" : "停用"}`);
    } catch (error) { renderSkills(); toast(error.message); }
  }

  function confirmLeaveEditor() {
    return !state.dirty || window.confirm("当前 Skill 文件有未保存的修改，确定离开吗？");
  }

  function closeEditor() {
    if (!confirmLeaveEditor()) return false;
    window.AIDWKnowledgeEditor?.closeRevisionDrawer();
    closeVersionHistory();
    state.current = null; state.currentFile = null; state.draft = ""; state.dirty = false; state.suggestion = null;
    refs.editor.classList.add("is-hidden"); refs.browser.classList.remove("is-hidden");
    return true;
  }

  async function openSkill(id) {
    if (state.current?.id === id || !confirmLeaveEditor()) return;
    window.AIDWKnowledgeEditor?.closeRevisionDrawer();
    const skill = state.skills.find((item) => item.id === id);
    if (!skill) return;
    state.current = skill; state.currentFile = null; state.draft = ""; state.dirty = false; state.suggestion = null;
    refs.browser.classList.add("is-hidden"); refs.editor.classList.remove("is-hidden");
    refs.editorTitle.textContent = skill.title;
    refs.editorDescription.textContent = cardDescription(skill.description);
    refs.editorDescription.title = skill.description;
    refs.deleteButton.classList.toggle("is-hidden", skill.kind === "platform");
    refs.metadataButton.classList.toggle("is-hidden", skill.kind === "platform");
    refs.fileSave.classList.toggle("is-hidden", skill.kind === "platform");
    refs.publishButton.classList.toggle("is-hidden", skill.kind === "platform");
    refs.historyButton.disabled = false;
    refs.editorStatus.textContent = "正在加载";
    try {
      const payload = await api(`/api/skills/${encodeURIComponent(id)}/files`);
      state.files = payload.items || payload.files || payload;
      if (payload.sha256) state.current.sha256 = payload.sha256;
      renderFileTree();
      updateSkillState();
      const first = state.files.find((file) => file.path === "SKILL.md") || state.files[0];
      if (first) await openFile(first.path);
    } catch (error) { refs.editorStatus.textContent = "加载失败"; toast(error.message); }
    refreshIcons();
  }

  function fileIcon(path) {
    if (path.endsWith(".md")) return "file-text";
    if (/\.(?:js|ts|py|sh|sql|json|ya?ml)$/i.test(path)) return "file-code-2";
    return "file";
  }

  function renderFileTree() {
    refs.fileTree.innerHTML = state.files.map((file) => {
      const depth = Math.min(2, String(file.path).split("/").length - 1);
      return `<button class="skill-file-row ${file.path === state.currentFile?.path ? "is-active" : ""}" data-skill-path="${escapeHtml(file.path)}" data-depth="${depth}" type="button" role="treeitem">${icon(fileIcon(file.path))}<span>${escapeHtml(file.path)}</span></button>`;
    }).join("") || '<div class="skill-empty">没有文件</div>';
    refreshIcons();
  }

  async function openFile(path) {
    if (state.dirty && path !== state.currentFile?.path && !window.confirm("当前文件有未保存修改，确定切换吗？")) return;
    try {
      const file = await api(`/api/skills/${encodeURIComponent(state.current.id)}/files/${path.split("/").map(encodeURIComponent).join("/")}`);
      state.currentFile = file; state.draft = file.content || ""; state.dirty = false; state.suggestion = null;
      const fileIndex = state.files.findIndex((item) => item.path === file.path);
      if (fileIndex >= 0) state.files[fileIndex] = { ...state.files[fileIndex], ...file };
      refs.fileName.textContent = file.path; refs.fileMeta.textContent = `${formatBytes(file.size || new Blob([state.draft]).size)} · ${String(file.sha256 || "").slice(0, 12)}`;
      refs.fileInput.value = state.draft; refs.fileSave.disabled = true; refs.fileStatus.textContent = state.current.kind === "platform" ? "只读" : "已保存到草稿";
      refs.filePreview.innerHTML = file.is_text === false ? '<div class="skill-empty">二进制文件不可预览</div>' : (file.path.endsWith(".md") ? markdown(state.draft) : `<pre><code>${escapeHtml(state.draft)}</code></pre>`);
      refs.aiEmpty.classList.remove("is-hidden"); refs.aiReview.classList.add("is-hidden");
      renderFileTree(); setFileMode("preview"); updateSkillState();
    } catch (error) { toast(error.message); }
  }

  function setFileMode(mode) {
    if (!state.currentFile) mode = "preview";
    if (state.current?.kind === "platform") mode = "preview";
    state.fileMode = mode;
    document.querySelectorAll("[data-skill-file-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.skillFileMode === mode));
    refs.filePreview.classList.toggle("is-hidden", mode === "edit");
    refs.fileInput.classList.toggle("is-hidden", mode !== "edit");
    if (mode === "edit") refs.fileInput.focus();
  }

  function markDirty() {
    if (!state.currentFile) return;
    state.draft = refs.fileInput.value;
    state.dirty = state.draft !== (state.currentFile.content || "");
    refs.fileSave.disabled = !state.dirty;
    refs.fileStatus.textContent = state.dirty ? "未保存" : "已保存到草稿";
    updateSkillState();
  }

  async function saveCurrentFile(content = state.draft) {
    if (!state.currentFile || state.current.kind === "platform") return;
    try {
      const saved = await api(`/api/skills/${encodeURIComponent(state.current.id)}/files/${state.currentFile.path.split("/").map(encodeURIComponent).join("/")}`, {
        method: "PUT", body: JSON.stringify({ content, base_sha256: state.currentFile.sha256 }),
      });
      state.currentFile = saved; state.draft = saved.content; state.dirty = false; refs.fileInput.value = saved.content;
      if (saved.skill_sha256) state.current.sha256 = saved.skill_sha256;
      if (saved.publish_status) state.current.publish_status = saved.publish_status;
      refs.fileSave.disabled = true; refs.fileStatus.textContent = "已保存到草稿";
      const index = state.files.findIndex((file) => file.path === saved.path);
      if (index >= 0) state.files[index] = { ...state.files[index], ...saved };
      refs.filePreview.innerHTML = saved.path.endsWith(".md") ? markdown(saved.content) : `<pre><code>${escapeHtml(saved.content)}</code></pre>`;
      updateSkillState(); renderSkills(); toast("文件已保存到 Skill 草稿");
      return saved;
    } catch (error) { refs.fileStatus.textContent = "保存失败"; toast(error.message); return null; }
  }

  function versionFileRows(files, emptyText = "此版本没有文件") {
    return (files || []).map((file) => `<div class="skill-version-file"><span>${icon(file.change === "added" ? "file-plus-2" : file.change === "deleted" ? "file-minus-2" : file.change === "modified" ? "file-pen-line" : "file")}<strong>${escapeHtml(file.path)}</strong></span><small>${escapeHtml(file.label || formatBytes(file.size || 0))}</small></div>`).join("") || `<div class="skill-version-empty">${escapeHtml(emptyText)}</div>`;
  }

  function nextVersionLabel(value) {
    const match = String(value || "").match(/^(?:v)?(\d+)\.(\d+)(?:\.(\d+))?$/);
    if (!match) return "v1.0.0";
    return `v${match[1]}.${Number(match[2]) + 1}.0`;
  }

  async function openPublishDialog() {
    if (!state.current || state.current.kind === "platform") return;
    if (state.dirty) return toast("请先保存当前文件到草稿");
    if (state.current.publish_status === "published") return toast("当前草稿与已发布版本一致");
    if (state.current.publish_status === "reviewing") return toast("当前版本正在等待审核");
    try {
      const [history, reviewers] = await Promise.all([
        api(`/api/skills/${encodeURIComponent(state.current.id)}/versions`),
        api(`/api/spaces/${encodeURIComponent(state.spaceId)}/reviewers`),
      ]);
      state.reviewers = reviewers || [];
      if (!state.reviewers.length) throw new Error("当前空间没有可选审核人");
      const latest = history.items?.find((version) => (version.review_status || "approved") === "approved");
      const previous = new Map((latest?.files || []).map((file) => [file.path, file]));
      const changes = state.files.filter((file) => previous.get(file.path)?.sha256 !== file.sha256).map((file) => ({ ...file, change: previous.has(file.path) ? "modified" : "added", label: previous.has(file.path) ? "已修改" : "新增" }));
      (latest?.files || []).filter((file) => !state.files.some((item) => item.path === file.path)).forEach((file) => changes.push({ ...file, change: "deleted", label: "已删除" }));
      if (latest && (latest.title !== state.current.title || latest.name !== state.current.name || latest.description !== state.current.description)) changes.unshift({ path: "Skill 基本信息", size: 0, change: "modified", label: "已修改" });
      refs.publishVersion.value = latest ? nextVersionLabel(latest.version) : "v1.0.0";
      refs.publishNotes.value = "";
      refs.publishReviewer.replaceChildren(
        new Option("请选择当前空间成员", ""),
        ...state.reviewers.map((reviewer) => new Option(
          `${reviewer.username} · ${reviewer.role_label || reviewer.role || "成员"}`,
          reviewer.username,
        )),
      );
      refs.publishReviewer.value = "";
      refs.publishSubtitle.textContent = `将当前草稿的 ${state.files.length} 个文件冻结为完整版本`;
      refs.publishChangeCount.textContent = `${changes.length} 项变更`;
      refs.publishChanges.innerHTML = versionFileRows(changes, "首次发布将创建完整快照");
      refs.publishError.textContent = "";
      refs.publishDialog.showModal(); refreshIcons();
    } catch (error) { toast(error.message); }
  }

  async function publishSkill(event) {
    event.preventDefault();
    if (!refs.publishReviewer.value) {
      refs.publishError.textContent = "请选择审核人";
      refs.publishReviewer.focus();
      return;
    }
    try {
      const result = await api(`/api/skills/${encodeURIComponent(state.current.id)}/publish`, { method: "POST", body: JSON.stringify({
        version: refs.publishVersion.value.trim(), notes: refs.publishNotes.value.trim(), base_sha256: state.current.sha256,
        space_id: state.spaceId, reviewer: refs.publishReviewer.value,
      }) });
      Object.assign(state.current, result.skill || result);
      refs.publishDialog.close(); updateSkillState(); renderSkills(); window.AIDWSkillReview?.refreshCount?.(); toast(`${state.current.pending_version || refs.publishVersion.value} 已提交审核`);
    } catch (error) { refs.publishError.textContent = error.message; }
  }

  function closeVersionHistory() { if (refs.versionDrawer) refs.versionDrawer.hidden = true; }

  function skillLineDiff(previousContent, currentContent) {
    const previous = String(previousContent || "").split("\n");
    const current = String(currentContent || "").split("\n");
    if (previous.join("\n") === current.join("\n")) return [];
    let prefixLength = 0;
    while (prefixLength < previous.length && prefixLength < current.length && previous[prefixLength] === current[prefixLength]) prefixLength += 1;
    let suffixLength = 0;
    while (
      suffixLength < previous.length - prefixLength
      && suffixLength < current.length - prefixLength
      && previous[previous.length - suffixLength - 1] === current[current.length - suffixLength - 1]
    ) suffixLength += 1;
    const previousMiddle = previous.slice(prefixLength, previous.length - suffixLength);
    const currentMiddle = current.slice(prefixLength, current.length - suffixLength);
    const prefix = previous.slice(0, prefixLength).map((line) => ({ type: "same", text: line }));
    const suffix = suffixLength ? previous.slice(previous.length - suffixLength).map((line) => ({ type: "same", text: line })) : [];
    if (!previousMiddle.length) return [...prefix, ...currentMiddle.map((line) => ({ type: "add", text: line })), ...suffix];
    if (!currentMiddle.length) return [...prefix, ...previousMiddle.map((line) => ({ type: "remove", text: line })), ...suffix];
    if (previousMiddle.length * currentMiddle.length > 1000000) return [
      ...prefix,
      ...previousMiddle.map((line) => ({ type: "remove", text: line })),
      ...currentMiddle.map((line) => ({ type: "add", text: line })),
      ...suffix,
    ];
    const matrix = Array.from({ length: previousMiddle.length + 1 }, () => new Uint32Array(currentMiddle.length + 1));
    for (let left = previousMiddle.length - 1; left >= 0; left -= 1) {
      for (let right = currentMiddle.length - 1; right >= 0; right -= 1) {
        matrix[left][right] = previousMiddle[left] === currentMiddle[right]
          ? matrix[left + 1][right + 1] + 1
          : Math.max(matrix[left + 1][right], matrix[left][right + 1]);
      }
    }
    const diff = [...prefix];
    let left = 0;
    let right = 0;
    while (left < previousMiddle.length && right < currentMiddle.length) {
      if (previousMiddle[left] === currentMiddle[right]) { diff.push({ type: "same", text: previousMiddle[left] }); left += 1; right += 1; }
      else if (matrix[left + 1][right] >= matrix[left][right + 1]) { diff.push({ type: "remove", text: previousMiddle[left++] }); }
      else { diff.push({ type: "add", text: currentMiddle[right++] }); }
    }
    while (left < previousMiddle.length) diff.push({ type: "remove", text: previousMiddle[left++] });
    while (right < currentMiddle.length) diff.push({ type: "add", text: currentMiddle[right++] });
    return [...diff, ...suffix];
  }

  function compactSkillDiff(lines, context = 3) {
    const visible = new Set();
    lines.forEach((line, index) => {
      if (line.type === "same") return;
      for (let offset = Math.max(0, index - context); offset <= Math.min(lines.length - 1, index + context); offset += 1) visible.add(offset);
    });
    const output = [];
    let previousIndex = -2;
    [...visible].sort((left, right) => left - right).forEach((index) => {
      if (index > previousIndex + 1) output.push({ type: "gap", text: "未变更内容已折叠" });
      output.push(lines[index]); previousIndex = index;
    });
    return output;
  }

  function skillVersionFileChanges(version) {
    const currentFiles = new Map((version.files || []).map((file) => [file.path, file]));
    const previousFiles = new Map((version.previous_files || []).map((file) => [file.path, file]));
    return (version.changes || []).map((change) => {
      const current = currentFiles.get(change.path);
      const previous = previousFiles.get(change.path);
      const diff = skillLineDiff(previous?.content || "", current?.content || "");
      return {
        ...change,
        additions: diff.filter((line) => line.type === "add").length,
        deletions: diff.filter((line) => line.type === "remove").length,
        diff,
      };
    });
  }

  function skillDiffHtml(lines) {
    const compact = compactSkillDiff(lines);
    if (!compact.length) return '<div class="knowledge-revision-diff knowledge-revision-diff-empty">文件内容没有变化</div>';
    return `<div class="knowledge-revision-diff skill-version-diff">${compact.map((line) => `<div class="knowledge-revision-diff-line is-${line.type}"><span>${line.type === "add" ? "+" : line.type === "remove" ? "-" : line.type === "gap" ? "…" : ""}</span><span>${escapeHtml(line.text || " ")}</span></div>`).join("")}</div>`;
  }

  function renderVersionDetail(version) {
    if (!version) { refs.versionDetail.innerHTML = '<div class="skill-empty">选择一个版本查看变更</div>'; return; }
    const fileChanges = skillVersionFileChanges(version);
    const additions = fileChanges.reduce((total, file) => total + file.additions, 0);
    const deletions = fileChanges.reduce((total, file) => total + file.deletions, 0);
    const selectedChange = fileChanges.find((file) => file.path === state.selectedVersionFile) || fileChanges[0];
    const selectedSnapshot = (version.files || []).find((file) => file.path === state.selectedSnapshotFile) || version.files?.[0];
    state.selectedVersionFile = selectedChange?.path || "";
    state.selectedSnapshotFile = selectedSnapshot?.path || "";
    const isCurrentRelease = version.review_status === "approved" && version.version === state.current.version;
    const isCurrentDraft = version.skill_sha256 === state.current.sha256;
    const restoreAction = state.current.kind !== "custom" || isCurrentDraft || isCurrentRelease ? "" : `<button class="command-button" type="button" data-skill-version-restore="${escapeHtml(version.revision_id)}">${icon("rotate-ccw")}<span>基于此版本创建草稿</span></button>`;
    const reviewState = version.review_status === "reviewing" ? `<span class="knowledge-revision-current is-reviewing">${icon("clock-3")}审核中</span>` : version.review_status === "rejected" ? `<span class="knowledge-revision-current is-rejected">${icon("circle-x")}已驳回</span>` : "";
    const releaseState = isCurrentRelease ? `<span class="knowledge-revision-current">${icon("circle-check")}当前发布版本</span>` : reviewState;
    const metadataHtml = (version.metadata_changes || []).length ? `<section class="skill-version-metadata"><header><strong>基本信息</strong><span>${version.metadata_changes.length} 项修改</span></header>${version.metadata_changes.map((change) => `<div class="skill-version-metadata-row"><strong>${escapeHtml(change.label)}</strong><span><del>${escapeHtml(change.previous || "空")}</del><i data-lucide="arrow-right"></i><ins>${escapeHtml(change.current || "空")}</ins></span></div>`).join("")}</section>` : "";
    const changeView = `<section class="skill-version-change-summary"><strong>${version.previous_version ? "本次变更" : "首次发布"}</strong><span>${fileChanges.length} 个文件</span><b class="is-add">+${additions}</b><b class="is-remove">-${deletions}</b></section>${metadataHtml}<div class="skill-version-change-list">${fileChanges.map((file) => `<button class="skill-version-file-change ${file.path === selectedChange?.path ? "is-active" : ""}" type="button" data-skill-version-file="${escapeHtml(file.path)}"><span>${icon(file.change === "added" ? "file-plus-2" : file.change === "deleted" ? "file-minus-2" : "file-pen-line")}<strong>${escapeHtml(file.path)}</strong><small>${escapeHtml(file.label)}</small></span><span><b class="is-add">+${file.additions}</b><b class="is-remove">-${file.deletions}</b></span></button>`).join("") || '<div class="skill-version-empty">此版本没有文件内容变更</div>'}</div>${selectedChange ? skillDiffHtml(selectedChange.diff) : ""}`;
    const snapshotView = `<div class="skill-version-browser"><nav>${(version.files || []).map((file) => `<button class="${file.path === selectedSnapshot?.path ? "is-active" : ""}" type="button" data-skill-snapshot-file="${escapeHtml(file.path)}">${icon("file")}<span>${escapeHtml(file.path)}</span><small>${escapeHtml(formatBytes(file.size || 0))}</small></button>`).join("")}</nav><pre class="knowledge-revision-content">${escapeHtml(selectedSnapshot?.content || "")}</pre></div>`;
    const reviewReason = version.review_status === "rejected" ? `<div class="skill-version-review-reason"><strong>驳回原因</strong><span>${escapeHtml(version.review_reason || "未填写")}</span></div>` : "";
    refs.versionDetail.innerHTML = `<header class="knowledge-revision-detail-head"><div><strong>${escapeHtml(version.version)}</strong><small>${escapeHtml(version.notes || "未填写发布说明")}</small></div><div class="skill-version-head-actions">${releaseState}${restoreAction}</div></header><div class="knowledge-revision-meta"><span>提交人：${escapeHtml(version.actor || "-")}</span><span>提交时间：${escapeHtml(formatDate(version.created_at))}</span><span>${Number(version.file_count || 0)} 个文件</span></div>${reviewReason}<div class="knowledge-revision-detail-tabs skill-version-view-tabs" role="group" aria-label="版本查看方式"><button class="${state.versionViewMode === "changes" ? "is-active" : ""}" type="button" data-skill-version-view="changes">变更内容</button><button class="${state.versionViewMode === "snapshot" ? "is-active" : ""}" type="button" data-skill-version-view="snapshot">浏览该版本</button></div>${state.versionViewMode === "snapshot" ? snapshotView : changeView}`;
    refs.versionDetail.querySelector("[data-skill-version-restore]")?.addEventListener("click", () => restoreSkillVersion(version.revision_id));
    refs.versionDetail.querySelectorAll("[data-skill-version-view]").forEach((button) => button.addEventListener("click", () => { state.versionViewMode = button.dataset.skillVersionView; renderVersionDetail(version); }));
    refs.versionDetail.querySelectorAll("[data-skill-version-file]").forEach((button) => button.addEventListener("click", () => { state.selectedVersionFile = button.dataset.skillVersionFile; renderVersionDetail(version); }));
    refs.versionDetail.querySelectorAll("[data-skill-snapshot-file]").forEach((button) => button.addEventListener("click", () => { state.selectedSnapshotFile = button.dataset.skillSnapshotFile; renderVersionDetail(version); }));
    refreshIcons();
  }

  async function selectSkillVersion(revisionId) {
    refs.versionDetail.innerHTML = '<div class="skill-empty">正在读取版本变更...</div>';
    try {
      const version = await api(`/api/skills/${encodeURIComponent(state.current.id)}/versions/${encodeURIComponent(revisionId)}`);
      state.versionViewMode = "changes"; state.selectedVersionFile = ""; state.selectedSnapshotFile = "";
      renderVersionDetail(version);
    } catch (error) { refs.versionDetail.innerHTML = `<div class="skill-empty">${escapeHtml(error.message)}</div>`; }
  }

  async function openSkillHistory() {
    if (!state.current) return;
    try {
      const history = await api(`/api/skills/${encodeURIComponent(state.current.id)}/versions`);
      refs.versionTitle.textContent = `${state.current.title} · 版本历史`;
      refs.versionList.innerHTML = (history.items || []).map((version, index) => { const label = version.review_status === "reviewing" ? "审核中" : version.review_status === "rejected" ? "已驳回" : version.version === state.current.version ? "当前" : "已发布"; return `<button class="knowledge-revision-item ${index === 0 ? "is-active" : ""}" type="button" data-skill-version-id="${escapeHtml(version.revision_id)}"><strong>${escapeHtml(version.version)}</strong><span>${label}</span><small>${escapeHtml(formatDate(version.created_at))} · ${Number(version.file_count || 0)} 个文件</small></button>`; }).join("") || '<div class="skill-empty">尚无发布申请</div>';
      refs.versionList.querySelectorAll("[data-skill-version-id]").forEach((button) => button.addEventListener("click", () => {
        refs.versionList.querySelectorAll(".knowledge-revision-item").forEach((item) => item.classList.toggle("is-active", item === button));
        selectSkillVersion(button.dataset.skillVersionId);
      }));
      refs.versionDrawer.hidden = false; refreshIcons();
      if (history.items?.[0]) await selectSkillVersion(history.items[0].revision_id);
      else renderVersionDetail(null);
    } catch (error) { toast(error.message); }
  }

  async function restoreSkillVersion(revisionId) {
    if (state.dirty) return toast("请先保存当前文件到草稿");
    if (!window.confirm("将以该已发布版本覆盖当前草稿，已发布版本本身不会改变。确定继续吗？")) return;
    try {
      const result = await api(`/api/skills/${encodeURIComponent(state.current.id)}/versions/${encodeURIComponent(revisionId)}/restore`, { method: "POST", body: JSON.stringify({ base_sha256: state.current.sha256 }) });
      Object.assign(state.current, result.skill || {}); state.files = result.files || [];
      state.currentFile = null; state.draft = ""; state.dirty = false; closeVersionHistory();
      refs.editorTitle.textContent = state.current.title; refs.editorDescription.textContent = cardDescription(state.current.description); refs.editorDescription.title = state.current.description;
      renderFileTree(); updateSkillState(); renderSkills();
      const first = state.files.find((file) => file.path === "SKILL.md") || state.files[0];
      if (first) await openFile(first.path);
      toast("已基于历史版本创建新草稿");
    } catch (error) { toast(error.message); }
  }

  async function canManageSkills() {
    try {
      const account = await api("/api/account/me");
      if (account.role === "admin") return true;
    } catch (_error) {
      // Use the same user-facing message for unavailable or unauthorized accounts.
    }
    toast("请联系管理员");
    return false;
  }

  function openMetadata() {
    if (!state.current || state.current.kind === "platform") return;
    refs.metadataHeading.textContent = "Skill 基本信息"; refs.metadataSubmitLabel.textContent = "保存";
    refs.metadataTitle.value = state.current.title; refs.metadataName.value = state.current.name;
    refs.metadataDescription.value = state.current.description; refs.metadataError.textContent = "";
    refs.metadataDialog.showModal();
  }

  async function saveMetadata(event) {
    event.preventDefault();
    try {
      const updated = await api(`/api/skills/${encodeURIComponent(state.current.id)}/metadata`, { method: "PATCH", body: JSON.stringify({
        title: refs.metadataTitle.value.trim(), name: refs.metadataName.value.trim(), description: refs.metadataDescription.value.trim(), base_sha256: state.current.sha256,
      }) });
      Object.assign(state.current, updated);
      refs.editorTitle.textContent = updated.title;
      refs.editorDescription.textContent = cardDescription(updated.description);
      refs.editorDescription.title = updated.description;
      if (state.currentFile) await openFile(state.currentFile.path);
      refs.metadataDialog.close(); updateSkillState(); renderSkills(); toast("基本信息已保存到 Skill 草稿");
    } catch (error) { refs.metadataError.textContent = error.message; }
  }

  function renderDiff(lines) {
    return (lines || []).map((line) => `<div class="skill-diff-line ${line.type || "context"}">${line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}${escapeHtml(line.text)}</div>`).join("");
  }

  async function suggestEdit() {
    const instruction = refs.aiInstruction.value.trim();
    if (!state.currentFile) return toast("请先选择文件");
    if (!instruction) return toast("请输入修改要求");
    try {
      const suggestion = await api(`/api/skills/${encodeURIComponent(state.current.id)}/edit-suggestions`, { method: "POST", body: JSON.stringify({
        path: state.currentFile.path, instruction, draft_content: refs.fileInput.value || state.draft, base_sha256: state.currentFile.sha256, model_id: "mock",
      }) });
      state.suggestion = suggestion; refs.aiSummary.textContent = suggestion.summary; refs.aiDiff.innerHTML = renderDiff(suggestion.diff);
      refs.aiEmpty.classList.add("is-hidden"); refs.aiReview.classList.remove("is-hidden");
    } catch (error) { toast(error.message); }
  }

  function discardSuggestion() { state.suggestion = null; refs.aiReview.classList.add("is-hidden"); refs.aiEmpty.classList.remove("is-hidden"); }
  async function applySuggestion() {
    if (!state.suggestion) return;
    const saved = await saveCurrentFile(state.suggestion.proposed_content);
    if (saved) { discardSuggestion(); refs.aiInstruction.value = ""; setFileMode("preview"); }
  }

  async function openDeleteSkill(id = state.current?.id) {
    if (!await canManageSkills()) return;
    const skill = state.skills.find((item) => item.id === id);
    if (!skill || skill.kind !== "custom") return;
    state.deleteSkillId = id;
    refs.deleteName.textContent = skill.title;
    refs.deleteError.textContent = "";
    refs.deleteError.hidden = true;
    refs.deleteDialog.showModal();
  }

  async function confirmDeleteSkill() {
    const id = state.deleteSkillId;
    const skill = state.skills.find((item) => item.id === id);
    if (!id || !skill) return refs.deleteDialog.close();
    refs.deleteConfirm.disabled = true;
    refs.deleteError.hidden = true;
    try {
      await api(`/api/custom-skills/${encodeURIComponent(id)}`, { method: "DELETE" });
      state.bindings = state.bindings.filter((item) => item.skill_id !== id); state.loaded = false;
      refs.deleteDialog.close();
      if (state.current?.id === id) { state.dirty = false; closeEditor(); }
      await loadSkills(true); await persistBindings(); toast("Skill 已删除");
    } catch (error) {
      refs.deleteError.textContent = error.message;
      refs.deleteError.hidden = false;
    } finally { refs.deleteConfirm.disabled = false; }
  }

  async function exportSkill() {
    if (!state.current || !window.JSZip) return toast("ZIP 组件尚未加载");
    try {
      const zip = new JSZip();
      for (const entry of state.files) {
        const file = await api(`/api/skills/${encodeURIComponent(state.current.id)}/files/${entry.path.split("/").map(encodeURIComponent).join("/")}`);
        zip.file(file.path, file.content || "");
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${state.current.name || state.current.id}.zip`; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) { toast(error.message); }
  }

  function ignoredPath(path) { return /(?:^|\/)(?:__MACOSX|__pycache__|\.pytest_cache|\.ruff_cache|\.DS_Store)(?:\/|$)|(?:^|\/)\._[^/]+$|\.pyc$/i.test(path); }
  function safePath(path) {
    const normalized = String(path || "").replaceAll("\\", "/").replace(/^\/+/, "");
    if (!normalized || normalized.split("/").includes("..")) throw new Error("文件路径不安全");
    return normalized;
  }

  function fileText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error(`无法读取 ${file.name}`)); reader.readAsText(file); }); }

  async function extractInputFiles(files) {
    const incoming = [...files];
    if (!incoming.length) throw new Error("请选择 Skill 文件");
    if (incoming.length === 1 && /\.zip$/i.test(incoming[0].name)) {
      if (!window.JSZip) throw new Error("ZIP 组件尚未加载");
      if (incoming[0].size > 4 * 1024 * 1024) throw new Error("ZIP 不能超过 4 MB");
      const zip = await JSZip.loadAsync(incoming[0]); const output = [];
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || ignoredPath(entry.name)) continue;
        const path = safePath(entry.name);
        const bytes = await entry.async("uint8array");
        if (bytes.byteLength > 2 * 1024 * 1024) throw new Error(`${path} 超过 2 MB`);
        output.push({ path, content: new TextDecoder("utf-8", { fatal: false }).decode(bytes), size: bytes.byteLength });
      }
      return { filename: incoming[0].name, files: normalizeRoot(output) };
    }
    const output = [];
    for (const file of incoming) {
      const path = safePath(file.webkitRelativePath || file.name);
      if (ignoredPath(path)) continue;
      if (file.size > 2 * 1024 * 1024) throw new Error(`${path} 超过 2 MB`);
      output.push({ path, content: await fileText(file), size: file.size });
    }
    return { filename: incoming.length === 1 ? incoming[0].name : (incoming[0].webkitRelativePath.split("/")[0] || "skill-folder"), files: normalizeRoot(output) };
  }

  function normalizeRoot(files) {
    const parts = files.map((file) => file.path.split("/"));
    if (parts.length && parts.every((part) => part.length > 1 && part[0] === parts[0][0])) files.forEach((file) => { file.path = file.path.split("/").slice(1).join("/"); });
    return files;
  }

  function validateImport(bundle) {
    if (bundle.files.length > 200) throw new Error("有效文件不能超过 200 个");
    if (bundle.files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) throw new Error("整个 Skill 包不能超过 4 MB");
    const manifests = bundle.files.filter((file) => file.path === "SKILL.md");
    if (manifests.length !== 1) throw new Error("Skill 包必须且只能包含一个根目录 SKILL.md");
  }

  async function selectImport(files) {
    refs.importError.textContent = ""; refs.importSubmit.disabled = true;
    try {
      const bundle = await extractInputFiles(files); validateImport(bundle);
      state.importFiles = bundle.files; state.importFilename = bundle.filename;
      refs.importSelection.classList.remove("is-hidden"); refs.importSelection.innerHTML = `<strong>${escapeHtml(bundle.filename)}</strong><br><small>${bundle.files.length} 个文件 · ${formatBytes(bundle.files.reduce((sum, file) => sum + file.size, 0))} · 已通过路径和大小校验</small>`;
      refs.importSubmit.disabled = false;
    } catch (error) { state.importFiles = []; refs.importSelection.classList.add("is-hidden"); refs.importError.textContent = error.message; }
  }

  function resetImport() { state.importFiles = []; state.importFilename = ""; refs.importError.textContent = ""; refs.importSelection.classList.add("is-hidden"); refs.importSubmit.disabled = true; refs.importFile.value = ""; }

  async function importSkill(event) {
    event.preventDefault();
    try {
      const skill = await api("/api/custom-skills/import", { method: "POST", body: JSON.stringify({ filename: state.importFilename, files: state.importFiles.map(({ path, content }) => ({ path, data: content })) }) });
      refs.importDialog.close(); resetImport(); await loadSkills(true);
      await openSkill(skill.id); toast("Skill 已导入");
    } catch (error) { refs.importError.textContent = error.message; }
  }

  function selectedBinding(skillId) {
    return state.bindings.find((item) => item.skill_id === skillId);
  }

  async function publishedVersions(skillId, force = false) {
    if (!force && state.versionCache[skillId]) return state.versionCache[skillId];
    const payload = await api(`/api/skills/${encodeURIComponent(skillId)}/versions`);
    const versions = (payload.items || []).filter((item) => (item.review_status || "approved") === "approved");
    state.versionCache[skillId] = versions;
    return versions;
  }

  async function hydrateBindings() {
    if (!state.loaded || !state.bindings.length) return;
    const hydrated = [];
    for (const binding of state.bindings.slice(0, 10)) {
      const skill = state.skills.find((item) => item.id === binding.skill_id);
      if (!skill || skill.enabled === false) continue;
      try {
        const versions = await publishedVersions(skill.id);
        const selected = versions.find((item) => item.revision_id === binding.revision_id)
          || versions.find((item) => item.version === skill.version)
          || versions[0];
        if (selected) hydrated.push({ skill_id: skill.id, revision_id: selected.revision_id, version: selected.version });
      } catch (_) { /* Keep the rest of the selector usable when one Skill fails. */ }
    }
    state.bindings = hydrated;
  }

  function renderPickerButton() {
    const count = state.bindings.length;
    refs.pickerButtonLabel.textContent = count ? `Skills ${count}` : "Skills";
    refs.pickerSummary.textContent = `已选择 ${count} 个 Skill`;
  }

  function renderContext() {
    const items = state.bindings.map((binding) => ({ binding, skill: state.skills.find((item) => item.id === binding.skill_id) })).filter((item) => item.skill);
    refs.context.classList.toggle("is-hidden", !items.length);
    refs.contextItems.innerHTML = items.map(({ skill, binding }) => `<span class="skill-context-item"><button type="button" data-skill-edit="${escapeHtml(skill.id)}" title="切换 ${escapeHtml(skill.title)} 的版本">${escapeHtml(skill.title)} · ${escapeHtml(binding.version || "未选择版本")}</button><button type="button" data-skill-unbind="${escapeHtml(skill.id)}" aria-label="移除 ${escapeHtml(skill.title)}">${icon("x")}</button></span>`).join("");
    renderPickerButton();
    refreshIcons();
  }

  function renderPickerList() {
    if (!refs.pickerList) return;
    const query = state.pickerQuery.toLowerCase();
    const publishedSkills = state.skills.filter((skill) => skill.enabled !== false && Boolean(skill.version));
    const skills = publishedSkills.filter((skill) => `${skill.title} ${skill.name} ${skill.description}`.toLowerCase().includes(query));
    refs.pickerList.innerHTML = skills.length ? skills.map((skill) => {
      const binding = selectedBinding(skill.id);
      const status = binding?.version || skill.version;
      return `<div class="skill-picker-row${binding ? " is-selected" : ""}${state.pickerSkillId === skill.id ? " is-focused" : ""}" role="option" tabindex="0" aria-selected="${Boolean(binding)}" data-picker-skill="${escapeHtml(skill.id)}"><button class="skill-picker-toggle" type="button" data-picker-toggle="${escapeHtml(skill.id)}" aria-label="${binding ? "取消选择" : "选择"} ${escapeHtml(skill.title)}">${icon("check")}</button><span class="skill-picker-row-copy"><strong>${escapeHtml(skill.title)}</strong><small>${escapeHtml(status)}</small></span></div>`;
    }).join("") : `<div class="skill-picker-empty">${publishedSkills.length ? "没有匹配的 Skill" : "暂无已启用且已发布的 Skill"}</div>`;
    renderPickerButton();
    refreshIcons();
  }

  async function renderPickerVersions() {
    const skillId = state.pickerSkillId;
    const skill = state.skills.find((item) => item.id === skillId);
    refs.pickerVersionList.classList.remove("skill-picker-empty");
    if (!skill) {
      refs.pickerVersionList.innerHTML = '<div class="skill-picker-empty">选择一个 Skill 查看版本</div>';
      return;
    }
    if (skill.enabled === false) {
      refs.pickerVersionList.innerHTML = '<div class="skill-picker-empty">此 Skill 已停用，启用后可选择版本</div>';
      return;
    }
    refs.pickerVersionList.innerHTML = '<div class="skill-picker-empty">正在读取已发布版本...</div>';
    try {
      const versions = await publishedVersions(skill.id);
      if (state.pickerSkillId !== skillId) return;
      const binding = selectedBinding(skill.id);
      const options = versions.map((version, index) => `<button class="skill-picker-version-option${binding?.revision_id === version.revision_id ? " is-selected" : ""}" type="button" data-picker-version="${escapeHtml(version.revision_id)}"><span class="skill-picker-radio"></span><span class="skill-picker-version-copy"><strong>${escapeHtml(version.version)}</strong><small>${escapeHtml(version.notes || `发布于 ${formatDate(version.created_at)}`)}</small></span>${index === 0 ? '<em class="skill-picker-latest">最新</em>' : ""}</button>`).join("");
      refs.pickerVersionList.innerHTML = options || '<div class="skill-picker-empty">暂无已发布版本</div>';
    } catch (error) {
      refs.pickerVersionList.innerHTML = `<div class="skill-picker-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  async function persistBindings() {
    renderContext(); renderPickerList(); renderSkills();
    if (!state.conversationId) return;
    const bindings = state.bindings.map((item) => ({ ...item }));
    try { await api(`/api/conversations/${encodeURIComponent(state.conversationId)}/skills`, { method: "PATCH", body: JSON.stringify({ skill_bindings: bindings, skill_ids: bindings.map((item) => item.skill_id) }) }); }
    catch (error) { toast(error.message); }
  }

  async function bindSkill(id, keepView = false) {
    const existing = selectedBinding(id);
    if (existing) state.bindings = state.bindings.filter((item) => item.skill_id !== id);
    else {
      if (state.bindings.length >= 10) return toast("一个对话最多使用 10 个 Skill");
      try {
        const skill = state.skills.find((item) => item.id === id);
        if (skill?.enabled === false) return toast("此 Skill 已停用");
        const versions = await publishedVersions(id);
        const selected = versions.find((item) => item.version === skill?.version) || versions[0];
        if (!selected) return toast("此 Skill 暂无已发布版本");
        state.bindings.push({ skill_id: id, revision_id: selected.revision_id, version: selected.version });
      } catch (error) { return toast(error.message); }
    }
    await persistBindings();
    if (!keepView && selectedBinding(id)) {
      document.querySelector('.nav-button[data-view="chat"]')?.click();
    }
  }

  async function setPickerOpen(open, skillId = "") {
    if (open) {
      await loadSkills();
      const publishedSkills = state.skills.filter((skill) => skill.enabled !== false && Boolean(skill.version));
      const requestedSkillId = skillId || state.pickerSkillId || state.bindings[0]?.skill_id || "";
      state.pickerSkillId = publishedSkills.some((skill) => skill.id === requestedSkillId)
        ? requestedSkillId
        : (publishedSkills[0]?.id || "");
      refs.pickerMenu.hidden = false;
      refs.pickerButton.setAttribute("aria-expanded", "true");
      renderPickerList();
      renderPickerVersions();
      refs.pickerSearch.focus();
    } else {
      refs.pickerMenu.hidden = true;
      refs.pickerButton.setAttribute("aria-expanded", "false");
    }
  }

  function clearBindings() { state.bindings = []; persistBindings(); renderPickerVersions(); }

  async function entriesToFiles(items) {
    const output = [];
    async function walk(entry, prefix = "") {
      if (entry.isFile) await new Promise((resolve, reject) => entry.file((file) => { Object.defineProperty(file, "webkitRelativePath", { value: `${prefix}${file.name}`, configurable: true }); output.push(file); resolve(); }, reject));
      else if (entry.isDirectory) {
        const reader = entry.createReader(); const children = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        for (const child of children) await walk(child, `${prefix}${entry.name}/`);
      }
    }
    for (const item of items) { const entry = item.webkitGetAsEntry?.(); if (entry) await walk(entry); else { const file = item.getAsFile?.(); if (file) output.push(file); } }
    return output;
  }

  refs.search.addEventListener("input", () => { state.query = refs.search.value; renderSkills(); });
  refs.list.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-skill-toggle]");
    if (toggle) { event.stopPropagation(); setSkillEnabled(toggle.dataset.skillToggle, toggle.getAttribute("aria-checked") !== "true"); return; }
    const card = event.target.closest("[data-skill-id]"); if (card) openSkill(card.dataset.skillId);
  });
  refs.list.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("[data-skill-toggle]")) return;
    const card = event.target.closest("[data-skill-id]");
    if (!card) return;
    event.preventDefault();
    openSkill(card.dataset.skillId);
  });
  refs.fileTree.addEventListener("click", (event) => { const button = event.target.closest("[data-skill-path]"); if (button) openFile(button.dataset.skillPath); });
  refs.fileInput.addEventListener("input", markDirty); refs.fileInput.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveCurrentFile(); } });
  refs.pickerButton.addEventListener("click", (event) => { event.stopPropagation(); setPickerOpen(refs.pickerMenu.hidden); });
  refs.pickerSearch.addEventListener("input", () => { state.pickerQuery = refs.pickerSearch.value; renderPickerList(); });
  refs.pickerList.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-picker-skill]");
    if (!row) return;
    state.pickerSkillId = row.dataset.pickerSkill;
    renderPickerList();
    renderPickerVersions();
    if (event.target.closest("[data-picker-toggle]")) await bindSkill(state.pickerSkillId, true);
  });
  refs.pickerList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("[data-picker-skill]");
    if (!row) return;
    event.preventDefault();
    state.pickerSkillId = row.dataset.pickerSkill;
    renderPickerList();
    renderPickerVersions();
  });
  refs.pickerVersionList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-picker-version]");
    if (!button || !state.pickerSkillId) return;
    const versions = state.versionCache[state.pickerSkillId] || [];
    const version = versions.find((item) => item.revision_id === button.dataset.pickerVersion);
    if (!version) return;
    if (state.skills.find((skill) => skill.id === state.pickerSkillId)?.enabled === false) return toast("此 Skill 已停用");
    if (!selectedBinding(state.pickerSkillId) && state.bindings.length >= 10) return toast("一个对话最多使用 10 个 Skill");
    state.bindings = state.bindings.filter((item) => item.skill_id !== state.pickerSkillId);
    state.bindings.push({ skill_id: state.pickerSkillId, revision_id: version.revision_id, version: version.version });
    await persistBindings();
    renderPickerVersions();
  });
  refs.pickerClear.addEventListener("click", clearBindings);
  refs.pickerDone.addEventListener("click", () => setPickerOpen(false));
  document.querySelectorAll("[data-skill-file-mode]").forEach((button) => button.addEventListener("click", () => setFileMode(button.dataset.skillFileMode)));
  $("skill-editor-back").addEventListener("click", closeEditor); refs.fileSave.addEventListener("click", () => saveCurrentFile()); refs.historyButton.addEventListener("click", openSkillHistory); refs.publishButton.addEventListener("click", openPublishDialog);
  refs.addButton.addEventListener("click", async () => { if (await canManageSkills()) { resetImport(); refs.importDialog.showModal(); } });
  document.addEventListener("click", (event) => {
    if (!event.composedPath().some((node) => node.classList?.contains("skill-picker"))) setPickerOpen(false);
  });
  refs.metadataButton.addEventListener("click", openMetadata); refs.metadataForm.addEventListener("submit", saveMetadata);
  $("skill-metadata-close").addEventListener("click", () => refs.metadataDialog.close()); $("skill-metadata-cancel").addEventListener("click", () => refs.metadataDialog.close());
  refs.publishForm.addEventListener("submit", publishSkill);
  $("skill-publish-close").addEventListener("click", () => refs.publishDialog.close()); $("skill-publish-cancel").addEventListener("click", () => refs.publishDialog.close());
  $("skill-version-close").addEventListener("click", closeVersionHistory); $("skill-version-backdrop").addEventListener("click", closeVersionHistory);
  $("skill-ai-submit").addEventListener("click", suggestEdit); $("skill-ai-discard").addEventListener("click", discardSuggestion); $("skill-ai-apply").addEventListener("click", applySuggestion);
  refs.deleteButton.addEventListener("click", () => openDeleteSkill()); refs.exportButton.addEventListener("click", exportSkill);
  $("skill-delete-close").addEventListener("click", () => refs.deleteDialog.close()); $("skill-delete-cancel").addEventListener("click", () => refs.deleteDialog.close()); refs.deleteConfirm.addEventListener("click", confirmDeleteSkill);
  refs.deleteDialog.addEventListener("close", () => { state.deleteSkillId = ""; refs.deleteError.hidden = true; });
  $("skill-import-close").addEventListener("click", () => refs.importDialog.close()); $("skill-import-cancel").addEventListener("click", () => refs.importDialog.close()); refs.importForm.addEventListener("submit", importSkill);
  $("skill-import-file-button").addEventListener("click", () => refs.importFile.click());
  refs.importFile.addEventListener("change", () => selectImport(refs.importFile.files));
  refs.importDropzone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); refs.importFile.click(); } });
  ["dragenter", "dragover"].forEach((name) => refs.importDropzone.addEventListener(name, (event) => { event.preventDefault(); refs.importDropzone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach((name) => refs.importDropzone.addEventListener(name, (event) => { event.preventDefault(); refs.importDropzone.classList.remove("is-dragging"); }));
  refs.importDropzone.addEventListener("drop", async (event) => selectImport(await entriesToFiles(event.dataTransfer.items)));
  refs.contextItems.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-skill-unbind]");
    const edit = event.target.closest("[data-skill-edit]");
    if (remove) bindSkill(remove.dataset.skillUnbind, true);
    else if (edit) { event.stopPropagation(); setPickerOpen(true, edit.dataset.skillEdit); }
  });
  $("clear-skill-context").addEventListener("click", clearBindings);
  document.addEventListener("aidw:skill-review-updated", async () => {
    state.loaded = false; state.versionCache = {}; await loadSkills(true);
    if (!state.current) return;
    const refreshed = state.skills.find((skill) => skill.id === state.current.id);
    if (refreshed) { Object.assign(state.current, refreshed); updateSkillState(); }
  });
  window.addEventListener("beforeunload", (event) => { if (!state.dirty) return; event.preventDefault(); event.returnValue = ""; });

  window.DWAgentSkills = {
    onViewEnter: () => loadSkills(),
    isDirty: () => state.dirty,
    getSelectedIds: () => state.bindings.filter((item) => state.skills.find((skill) => skill.id === item.skill_id)?.enabled !== false).map((item) => item.skill_id),
    getSelectedBindings: () => state.bindings.filter((item) => state.skills.find((skill) => skill.id === item.skill_id)?.enabled !== false).map(({ skill_id, revision_id }) => ({ skill_id, revision_id })),
    setConversation: (conversation = {}) => {
      state.conversationId = conversation.id || "";
      const bindings = conversation.skill_bindings || conversation.custom_skill_bindings;
      state.bindings = Array.isArray(bindings)
        ? bindings.map((item) => ({ skill_id: item.skill_id, revision_id: item.revision_id || "", version: item.version || "" })).filter((item) => item.skill_id).slice(0, 10)
        : [...(conversation.custom_skill_ids || conversation.skill_ids || [])].slice(0, 10).map((skillId) => ({ skill_id: skillId, revision_id: "", version: "" }));
      renderContext();
      if (state.loaded) hydrateBindings().then(() => { renderContext(); renderPickerList(); });
    },
    setConversationId: (id) => { state.conversationId = id || ""; },
    clearForNewConversation: () => { state.conversationId = ""; state.bindings = []; renderContext(); if (state.loaded) renderSkills(); },
    setContext: ({ account, spaceId } = {}) => {
      if (account) state.account = account;
      if (spaceId) state.spaceId = spaceId;
    },
  };
})();
