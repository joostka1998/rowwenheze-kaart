(() => {
  "use strict";

  const config = window.MAP_CONFIG || {};

  const $ = (id) => document.getElementById(id);
  const viewport = $("map-viewport");
  const image = $("map");
  const errorElement = $("map-error");
  const legendElement = $("legend");
  const markerLayer = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  markerLayer.classList.add("map-markers");
  markerLayer.setAttribute("aria-hidden", "true");
  viewport.insertBefore(markerLayer, errorElement);

  const MAX_ZOOM = 8;
  const ZOOM_FACTOR = 1.25;

  let zoom = 1;
  let minZoom = 0.1;
  let offsetX = 0; // verschuiving ten opzichte van het midden
  let offsetY = 0;
  let imageLoaded = false;
  let frame = 0;

  /* ---------- Tekst en legenda ---------- */

  function setText(id, value) {
    const el = $(id);
    if (el && typeof value === "string" && value.trim()) {
      el.textContent = value;
    }
  }

  setText("page-title", config.title);
  setText("footer-text", config.footer);
  if (config.title) document.title = config.title;

  function getLegendItems() {
    return (Array.isArray(config.legend) ? config.legend : []).filter(
      (item) =>
        item &&
        typeof item.name === "string" &&
        /^#[0-9a-f]{6}$/i.test(item.color)
    );
  }

  function renderLegend() {
    const items = getLegendItems();
    if (items.length === 0) {
      const message = document.createElement("p");
      message.textContent = "Er zijn nog geen groepen ingesteld.";
      legendElement.replaceChildren(message);
      return;
    }

    const table = document.createElement("table");
    table.className = "legend-table";

    const header = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const heading of ["Kleur", "Naam Groep", "Huisje(s)"]) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = heading;
      headerRow.append(cell);
    }
    header.append(headerRow);

    const body = document.createElement("tbody");
    for (const { name, color, house_numbers } of items) {
      const row = document.createElement("tr");

      const colorCell = document.createElement("td");
      colorCell.className = "legend-color-cell";
      const swatch = document.createElement("span");
      swatch.className = "legend-color";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("aria-hidden", "true");
      colorCell.append(swatch);

      const nameCell = document.createElement("td");
      nameCell.className = "legend-name";
      nameCell.textContent = name;

      const housesCell = document.createElement("td");
      housesCell.textContent = Array.isArray(house_numbers)
        ? house_numbers
            .filter(
              (number) =>
                typeof number === "string" ||
                (typeof number === "number" && Number.isFinite(number))
            )
            .map(String)
            .join(", ")
        : "";

      row.append(colorCell, nameCell, housesCell);
      body.append(row);
    }

    table.append(header, body);
    legendElement.replaceChildren(table);
  }

  renderLegend();

  function renderMarkers() {
    const { naturalWidth, naturalHeight } = image;
    markerLayer.setAttribute("viewBox", `0 0 ${naturalWidth} ${naturalHeight}`);
    markerLayer.setAttribute("width", naturalWidth);
    markerLayer.setAttribute("height", naturalHeight);
    markerLayer.replaceChildren(
      ...getLegendItems()
        .flatMap(({ color, circles }) =>
          (Array.isArray(circles) ? circles : [])
            .filter(
              (circle) =>
                circle &&
                Number.isFinite(circle.x) &&
                Number.isFinite(circle.y) &&
                Number.isFinite(circle.diameter) &&
                circle.diameter > 0
            )
            .map((circle) => ({ ...circle, color }))
        )
        .map(({ color, x, y, diameter }) => {
          const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          circle.setAttribute("cx", x);
          circle.setAttribute("cy", y);
          circle.setAttribute("r", diameter / 2);
          circle.setAttribute("fill", "none");
          circle.setAttribute("stroke", color);
          circle.setAttribute("stroke-width", "8");
          return circle;
        })
    );
  }

  /* ---------- Kaart: weergave ---------- */

  function renderTransform() {
    frame = 0;
    $("zoom-out").disabled = zoom <= minZoom;
    const transform =
      `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
    image.style.transform = transform;
    markerLayer.style.transform = transform;
  }

  function clampOffset(offset, imageSize, viewportSize) {
    const scaledSize = imageSize * zoom;
    if (scaledSize <= viewportSize) return 0;

    const maxOffset = (scaledSize - viewportSize) / 2;
    return Math.max(-maxOffset, Math.min(maxOffset, offset));
  }

  function constrainMapPosition() {
    offsetX = clampOffset(offsetX, image.naturalWidth, viewport.clientWidth);
    offsetY = clampOffset(offsetY, image.naturalHeight, viewport.clientHeight);
  }

  // Meerdere events per frame samenvoegen tot één update.
  function scheduleRender() {
    constrainMapPosition();
    if (!frame) frame = requestAnimationFrame(renderTransform);
  }

  function fitMap() {
    if (!imageLoaded) return;

    const { naturalWidth: w, naturalHeight: h } = image;
    if (!w || !h) return;

    const fit = Math.min(viewport.clientWidth / w, viewport.clientHeight / h, 1);

    minZoom = fit;
    zoom = fit;
    offsetX = 0;       // 0 = precies gecentreerd
    offsetY = 0;

    scheduleRender();
  }

  function resizeMap() {
    if (!imageLoaded) return;

    const fit = Math.min(
      viewport.clientWidth / image.naturalWidth,
      viewport.clientHeight / image.naturalHeight,
      1
    );
    minZoom = fit;
    zoom = Math.max(zoom, minZoom);
    scheduleRender();
  }

  function zoomAt(nextZoom, clientX, clientY) {
    if (!imageLoaded) return;

    const newZoom = Math.min(MAX_ZOOM, Math.max(minZoom, nextZoom));
    if (newZoom === zoom) return;

    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    const ratio = newZoom / zoom;

    offsetX = px - (px - offsetX) * ratio;
    offsetY = py - (py - offsetY) * ratio;
    zoom = newZoom;

    scheduleRender();
  }

  function zoomAtCenter(nextZoom) {
    const rect = viewport.getBoundingClientRect();
    zoomAt(nextZoom, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  /* ---------- Afbeelding laden ---------- */

  image.addEventListener("load", () => {
    imageLoaded = true;
    errorElement.hidden = true;
    renderMarkers();
    fitMap();
  });

  image.addEventListener("error", () => {
    imageLoaded = false;
    errorElement.hidden = false;
  });

  if (typeof config.image === "string" && config.image.trim()) {
    image.src = config.image;
  }

  if (image.complete && image.naturalWidth > 0) {
    imageLoaded = true;
    renderMarkers();
    fitMap();
  }

  /* ---------- Knoppen, wiel, toetsenbord ---------- */

  $("zoom-in").addEventListener("click", () => zoomAtCenter(zoom * ZOOM_FACTOR));
  $("zoom-out").addEventListener("click", () => zoomAtCenter(zoom / ZOOM_FACTOR));
  $("zoom-reset").addEventListener("click", fitMap);

  viewport.addEventListener(
    "wheel",
    (event) => {
      if (!imageLoaded) return;
      event.preventDefault();
      // Vloeiender zoomen, ook met trackpads.
      const factor = Math.exp(-event.deltaY * 0.002);
      zoomAt(zoom * factor, event.clientX, event.clientY);
    },
    { passive: false }
  );

  viewport.addEventListener("dblclick", (event) => {
    zoomAt(zoom * ZOOM_FACTOR * 1.5, event.clientX, event.clientY);
  });

  viewport.addEventListener("keydown", (event) => {
    const step = 60;
    switch (event.key) {
      case "+":
      case "=": zoomAtCenter(zoom * ZOOM_FACTOR); break;
      case "-": zoomAtCenter(zoom / ZOOM_FACTOR); break;
      case "0": fitMap(); break;
      case "ArrowLeft":  offsetX += step; scheduleRender(); break;
      case "ArrowRight": offsetX -= step; scheduleRender(); break;
      case "ArrowUp":    offsetY += step; scheduleRender(); break;
      case "ArrowDown":  offsetY -= step; scheduleRender(); break;
      default: return;
    }
    event.preventDefault();
  });

  /* ---------- Slepen en knijpen (pinch-zoom) ---------- */

  const pointers = new Map();
  let dragStart = null;
  let pinchStart = null;

  function beginGesture() {
    const pts = [...pointers.values()];

    if (pts.length === 1) {
      dragStart = { x: pts[0].x, y: pts[0].y, ox: offsetX, oy: offsetY };
      pinchStart = null;
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom };
      dragStart = null;
    } else {
      dragStart = pinchStart = null;
    }
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (!imageLoaded || (event.pointerType === "mouse" && event.button !== 0)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewport.setPointerCapture(event.pointerId);
    beginGesture();
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchStart && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(
        pinchStart.zoom * (dist / pinchStart.dist),
        (a.x + b.x) / 2,
        (a.y + b.y) / 2
      );
    } else if (dragStart) {
      offsetX = dragStart.ox + event.clientX - dragStart.x;
      offsetY = dragStart.oy + event.clientY - dragStart.y;
      scheduleRender();
    }
  });

  function endPointer(event) {
    if (!pointers.delete(event.pointerId)) return;
    beginGesture(); // bijv. van 2 vingers terug naar 1 vinger
  }

  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);
  viewport.addEventListener("lostpointercapture", endPointer);

  /* ---------- Venster verandert van formaat ---------- */

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeMap, 100);
  });
})();