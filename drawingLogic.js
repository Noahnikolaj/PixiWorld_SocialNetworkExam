document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("drawingCanvas");
  const colorPicker = document.getElementById("colorPicker");
  const clearCanvasBtn = document.getElementById("clearCanvasBtn");
  const brushSize = document.getElementById("brushSize");
  const undoBtn = document.getElementById("undoCanvasBtn");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let lastCell = null;

  // store strokes for undo/replay
  let strokes = []; // each: { p, color, cells: [{cx,cy}] }
  let currentStroke = null;

  // pixel art settings
  const DEFAULT_PIXEL = 12;
  function pixelSize() {
    return brushSize
      ? Math.max(1, Math.round(Number(brushSize.value) || DEFAULT_PIXEL))
      : DEFAULT_PIXEL;
  }

  // disable smoothing for  pixels
  function applyCtxSettings() {
    ctx.imageSmoothingEnabled = false;
  }

  // size canvas for hi-dpi and CSS layout (keep logical drawing in CSS pixels)
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyCtxSettings();
    redrawAll(); // re-render strokes at new transform
  }

  function getPointerPos(e) {
    return { x: e.offsetX, y: e.offsetY };
  }

  function cellForPos(pos, p) {
    p = p || pixelSize();
    return {
      cx: Math.floor(pos.x / p),
      cy: Math.floor(pos.y / p),
    };
  }

  function drawCell(cx, cy, p, color) {
    p = p || pixelSize();
    color = color || (colorPicker ? colorPicker.value : "#000");
    ctx.fillStyle = color;
    ctx.fillRect(cx * p, cy * p, p, p);
  }

  // draw a line of cells between two cells
  function drawCellsLine(a, b, p, color) {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ix = Math.round(a.cx + dx * t);
      const iy = Math.round(a.cy + dy * t);
      drawCell(ix, iy, p, color);
      // if recording current stroke
      if (currentStroke) {
        const last = currentStroke.cells[currentStroke.cells.length - 1];
        if (!last || last.cx !== ix || last.cy !== iy) {
          currentStroke.cells.push({ cx: ix, cy: iy });
        }
      }
    }
  }

  function startDrawing(e) {
    isDrawing = true;
    const p = pixelSize();
    const col = colorPicker ? colorPicker.value : "#000";
    const pos = getPointerPos(e);
    const first = cellForPos(pos, p);

    currentStroke = { p: p, color: col, cells: [] };
    currentStroke.cells.push({ cx: first.cx, cy: first.cy });
    drawCell(first.cx, first.cy, p, col);
    lastCell = first;
    updateUndoState();
    e.preventDefault();
  }

  function draw(e) {
    if (!isDrawing || !currentStroke) return;
    const pos = getPointerPos(e);
    const cur = cellForPos(pos, currentStroke.p);
    if (!lastCell) {
      drawCell(cur.cx, cur.cy, currentStroke.p, currentStroke.color);
      currentStroke.cells.push({ cx: cur.cx, cy: cur.cy });
      lastCell = cur;
      return;
    }
    if (cur.cx !== lastCell.cx || cur.cy !== lastCell.cy) {
      drawCellsLine(lastCell, cur, currentStroke.p, currentStroke.color);
      lastCell = cur;
    }
    e.preventDefault();
  }

  function stopDrawing() {
    if (isDrawing && currentStroke && currentStroke.cells.length) {
      strokes.push(currentStroke);
    }
    isDrawing = false;
    lastCell = null;
    currentStroke = null;
    updateUndoState();
  }

  function clearCanvas() {
    // clear full canvas in CSS pixels (transform is applied)
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    // clear stored strokes
    strokes = [];
    currentStroke = null;
    updateUndoState();
  }

  function redrawAll() {
    // clear then replay strokes
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (let s of strokes) {
      for (let cell of s.cells) {
        drawCell(cell.cx, cell.cy, s.p, s.color);
      }
    }

    if (currentStroke) {
      for (let cell of currentStroke.cells) {
        drawCell(cell.cx, cell.cy, currentStroke.p, currentStroke.color);
      }
    }
  }

  function undoLastStroke() {
    if (!strokes.length) return;
    strokes.pop();
    redrawAll();
    updateUndoState();
  }

  function updateUndoState() {
    if (!undoBtn) return;
    undoBtn.disabled = strokes.length === 0 && !currentStroke;
    undoBtn.style.opacity = undoBtn.disabled ? "0.5" : "1";
  }

  // pointer events (mouse/touch/pen)
  canvas.addEventListener("pointerdown", startDrawing);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  canvas.addEventListener("pointerout", stopDrawing);

  if (clearCanvasBtn)
    clearCanvasBtn.addEventListener("click", () => {
      clearCanvas();
      // also update background grid CSS
      document.documentElement.style.setProperty(
        "--pixel-size",
        pixelSize() + "px"
      );
    });

  // Save / download canvas as PNG
  function saveCanvasPNG() {
    try {
      const dataURL = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataURL;
      a.download = `pixiworld-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Failed to save image", err);
      alert("Unable to save image.");
    }
  }

  const saveBtn = document.getElementById("saveCanvasBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveCanvasPNG);

  // marketplace posting controls
  const postMarketBtn = document.getElementById("postDrawingMarketBtn");
  const marketPrompt = document.getElementById("marketPrompt");

  function getMyUserIdLocal() {
    try {
      return localStorage.getItem("pixiworld:userId") || null;
    } catch (e) {
      return null;
    }
  }

  async function postDrawingToMarketplace() {
    if (!canvas) return;
    // export PNG dataURL
    const dataURL = canvas.toDataURL("image/png");
    const promptText = ((marketPrompt && marketPrompt.value) || "").trim();

    if (typeof createPost !== "function") {
      alert("Unable to post: createPost not available.");
      return;
    }

    // author info
    const nameEl = document.getElementById("editName");
    const author = nameEl ? (nameEl.textContent || "You").trim() : "You";
    let avatar = "img/avatars/avatar1.png";
    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) {
      const img =
        profileAvatar.tagName === "IMG"
          ? profileAvatar
          : profileAvatar.querySelector && profileAvatar.querySelector("img");
      if (img && img.src) avatar = img.src;
    }

    const created = createPost({
      author,
      authorId: getMyUserIdLocal(),
      avatar,
      text: promptText || "Shared a drawing",
      image: dataURL,
      marketplace: true,
    });

    if (created) {
      try {
        if (typeof showToast === "function")
          showToast("Posted to Marketplace", { type: "info" });
      } catch (e) {}
      // clear prompt but keep drawing
      if (marketPrompt) marketPrompt.value = "";
      // re-render feed if available
      if (typeof renderFeed === "function") renderFeed();
    } else {
      alert("Failed to create marketplace post (empty).");
    }
  }

  if (postMarketBtn)
    postMarketBtn.addEventListener("click", (e) => {
      e.preventDefault();
      postDrawingToMarketplace();
    });

  if (undoBtn) undoBtn.addEventListener("click", undoLastStroke);

  // when pixel size slider changes we don't alter existing drawing,
  // just affect subsequent strokes; update optional CSS grid var
  if (brushSize)
    brushSize.addEventListener("input", () => {
      document.documentElement.style.setProperty(
        "--pixel-size",
        pixelSize() + "px"
      );
    });

  // resize when shown or window resizes
  window.addEventListener("resize", resizeCanvas);
  const section = document.getElementById("drawing");
  if (section && typeof MutationObserver === "function") {
    const mo = new MutationObserver(() => resizeCanvas());
    mo.observe(section, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }

  //  sizing and undo state
  resizeCanvas();
  updateUndoState();
});
