(() => {
  "use strict";

  const config = window.MAP_CONFIG || {};
  const popupConfig = window.FIRST_VISIT_POPUP_CONFIG || {};

  const $ = (id) => document.getElementById(id);
  const viewport = $("map-viewport");
  const image = $("map");
  const errorElement = $("map-error");
  const legendElement = $("legend");
  const popup = $("first-visit-popup");
  const markerLayer = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  markerLayer.classList.add("map-markers");
  markerLayer.setAttribute("aria-hidden", "true");
  viewport.insertBefore(markerLayer, errorElement);

  const MAX_ZOOM = 8;
  const ZOOM_FACTOR = 1.25;
  const GROUP_ZOOM = 1.5;
  const GROUP_ANIMATION_DURATION = 600;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let zoom = 1;
  let minZoom = 0.1;
  let offsetX = 0; // verschuiving ten opzichte van het midden
  let offsetY = 0;
  let imageLoaded = false;
  let frame = 0;
  let zoomAnimationFrame = 0;
  let highlightTimer = 0;

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

  /* ---------- Eenmalige mobiele pop-up ---------- */

  function initializeFirstVisitPopup() {
    const mobileMediaQuery = window.matchMedia("(max-width: 600px)");
    const headerTrigger = $("header-snapchat-trigger");
    const snapchatUrl =
      typeof popupConfig.snapchatUrl === "string" && popupConfig.snapchatUrl.trim()
        ? popupConfig.snapchatUrl
        : "";

    if (snapchatUrl) {
      headerTrigger.href = snapchatUrl;
    } else {
      headerTrigger.hidden = true;
    }

    if (!popup || popupConfig.enabled !== true) {
      return;
    }

    const storageKey = "rowwenheze-kaart-popup-shown";
    setText("popup-headline", popupConfig.headline);
    setText("popup-snapchat-text", popupConfig.snapchatButtonText);
    setText("popup-close", popupConfig.closeButtonText);

    const snapchatLink = $("popup-snapchat-link");
    if (snapchatUrl) {
      snapchatLink.href = snapchatUrl;
    } else {
      snapchatLink.hidden = true;
    }

    const openPopup = () => {
      if (popup.open) return;

      try {
        window.localStorage.setItem(storageKey, "true");
      } catch (error) {
        console.warn("De pop-upstatus kan niet in localStorage worden opgeslagen.", error);
      }

      popup.showModal();
      snapchatLink.focus();
    };
    const closePopup = () => {
      if (popup.open) popup.close();
    };
    headerTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      openPopup();
    });
    $("popup-close").addEventListener("click", closePopup);
    popup.addEventListener("click", (event) => {
      if (event.target === popup) closePopup();
    });

    let alreadySeen = false;
    try {
      alreadySeen = window.localStorage.getItem(storageKey) === "true";
    } catch (error) {
      console.warn("De pop-upstatus kan niet uit localStorage worden gelezen.", error);
    }

    const delay =
      Number.isFinite(popupConfig.delayMs) && popupConfig.delayMs > 0
        ? popupConfig.delayMs
        : 0;
    if (mobileMediaQuery.matches && !alreadySeen) {
      window.setTimeout(openPopup, delay);
    }
  }

  initializeFirstVisitPopup();

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
    for (const [groupIndex, { name, color, house_numbers }] of items.entries()) {
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
      const nameButton = document.createElement("button");
      nameButton.className = "legend-name-button";
      nameButton.type = "button";
      nameButton.dataset.groupIndex = String(groupIndex);
      nameButton.textContent = name;
      nameCell.append(nameButton);

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
        .flatMap(({ color, circles }, groupIndex) =>
          (Array.isArray(circles) ? circles : []).map((circle) => ({
            circle,
            color,
            groupIndex
          }))
        )
        .filter(
          ({ circle }) =>
            circle &&
            Number.isFinite(circle.x) &&
            Number.isFinite(circle.y) &&
            Number.isFinite(circle.diameter) &&
            circle.diameter > 0
        )
        .map(({ circle: circleData, color, groupIndex }) => {
          const marker = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          marker.setAttribute("cx", circleData.x);
          marker.setAttribute("cy", circleData.y);
          marker.setAttribute("r", circleData.diameter / 2);
          marker.setAttribute("fill", "none");
          marker.setAttribute("stroke", color);
          marker.setAttribute("stroke-width", "8");
          marker.setAttribute("data-group-index", groupIndex);
          return marker;
        })
    );
  }

  /* ---------- Kaart: weergave ---------- */

  function cancelZoomAnimation() {
    if (zoomAnimationFrame) {
      cancelAnimationFrame(zoomAnimationFrame);
      zoomAnimationFrame = 0;
    }
  }

  function renderTransform() {
    frame = 0;
    $("zoom-out").disabled = zoom <= minZoom;
    const transform =
      `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
    image.style.transform = transform;
    markerLayer.style.transform = transform;
  }

  function clampOffset(offset, imageSize, viewportSize, scale = zoom) {
    const scaledSize = imageSize * scale;
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
    cancelZoomAnimation();
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
    minZoom = Math.min(fit, minZoom);
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

  function animateToGroup(x, y, groupIndex) {
    cancelZoomAnimation();

    const targetZoom = Math.min(MAX_ZOOM, Math.max(minZoom, GROUP_ZOOM));
    const targetOffsetX = clampOffset(
      -(x - image.naturalWidth / 2) * targetZoom,
      image.naturalWidth,
      viewport.clientWidth,
      targetZoom
    );
    const targetOffsetY = clampOffset(
      -(y - image.naturalHeight / 2) * targetZoom,
      image.naturalHeight,
      viewport.clientHeight,
      targetZoom
    );

    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    if (prefersReducedMotion.matches) {
      zoom = targetZoom;
      offsetX = targetOffsetX;
      offsetY = targetOffsetY;
      renderTransform();
    } else {
      const startedAt = performance.now();
      const startZoom = zoom;
      const startOffsetX = offsetX;
      const startOffsetY = offsetY;

      const animate = (now) => {
        const progress = Math.min((now - startedAt) / GROUP_ANIMATION_DURATION, 1);
        const eased = progress < 0.5
          ? 4 * progress ** 3
          : 1 - ((-2 * progress + 2) ** 3) / 2;

        zoom = startZoom + (targetZoom - startZoom) * eased;
        offsetX = startOffsetX + (targetOffsetX - startOffsetX) * eased;
        offsetY = startOffsetY + (targetOffsetY - startOffsetY) * eased;
        renderTransform();

        if (progress < 1) {
          zoomAnimationFrame = requestAnimationFrame(animate);
        } else {
          zoomAnimationFrame = 0;
        }
      };

      zoomAnimationFrame = requestAnimationFrame(animate);
    }

    if (highlightTimer) window.clearTimeout(highlightTimer);
    markerLayer.querySelectorAll(".is-highlighted").forEach((circle) => {
      circle.classList.remove("is-highlighted");
    });
    markerLayer
      .querySelectorAll(`[data-group-index="${groupIndex}"]`)
      .forEach((circle) => circle.classList.add("is-highlighted"));
    highlightTimer = window.setTimeout(() => {
      markerLayer.querySelectorAll(".is-highlighted").forEach((circle) => {
        circle.classList.remove("is-highlighted");
      });
      highlightTimer = 0;
    }, 1500);
  }

  legendElement.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-group-index]");
    if (!button || !legendElement.contains(button) || !imageLoaded) return;

    const groupIndex = Number(button.dataset.groupIndex);
    const item = getLegendItems()[groupIndex];
    const circles = item && Array.isArray(item.circles)
      ? item.circles.filter(
          (circle) =>
            circle &&
            Number.isFinite(circle.x) &&
            Number.isFinite(circle.y) &&
            Number.isFinite(circle.diameter) &&
            circle.diameter > 0
        )
      : [];
    if (circles.length === 0) return;

    const center = circles.reduce(
      (total, circle) => ({ x: total.x + circle.x, y: total.y + circle.y }),
      { x: 0, y: 0 }
    );
    const x = center.x / circles.length;
    const y = center.y / circles.length;

    viewport.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "center"
    });
    animateToGroup(x, y, groupIndex);
  });

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