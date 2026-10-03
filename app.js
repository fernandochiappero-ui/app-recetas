(() => {
  "use strict";

  const recipes = Array.isArray(window.RECIPES) ? window.RECIPES : [];
  const searchForm = document.querySelector(".search-form");
  const searchInput = document.querySelector("#ingredient-search");
  const results = document.querySelector("#recipe-results");
  const resultsCount = document.querySelector("#results-count");
  const searchMessage = document.querySelector("#search-message");
  const dialog = document.querySelector("#recipe-dialog");
  const recipePage = document.querySelector("#recipe-page");
  const pdfError = document.querySelector("#pdf-error");
  const recipeImagePanel = document.querySelector(".recipe-image-panel");
  const pdfName = "EBOOK.RESETEO.ABDOMINAL.pdf";
  const pdfjs = window.pdfjsLib;
  if (pdfjs) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  let pdfDocumentPromise;
  let activePdfPage = null;
  let activePdfRenderTask = null;
  let renderSequence = 0;
  const suggestions = ["zanahoria", "zapallo", "espinaca", "tomate", "brócoli", "berenjena"];
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const vegetableGroups = [
    ["acelga", "acelgas"],
    ["ajo", "ajos"],
    ["alcachofa", "alcachofas", "alcaucil", "alcauciles"],
    ["apio"],
    ["arveja", "arvejas", "guisante", "guisantes", "chícharo", "chícharos"],
    ["batata", "boniato", "camote"],
    ["berenjena", "berenjenas"],
    ["brócoli", "brócolis", "brocoli"],
    ["calabaza", "calabazas", "calabacín", "calabacines", "zapallo", "zapallos", "zapallito", "zapallitos", "zucchini", "zucchinis"],
    ["cebolla", "cebollas"],
    ["cebolla de verdeo", "cebollín", "cebollin"],
    ["champiñón", "champiñones", "hongos", "setas"],
    ["choclo", "maíz", "maiz"],
    ["coliflor"],
    ["espárrago", "esparrago", "espárragos", "esparragos"],
    ["espinaca", "espinacas"],
    ["hinojo"],
    ["kale", "col rizada"],
    ["lechuga"],
    ["morrón", "morron", "pimiento", "pimientos"],
    ["pepino", "pepinos"],
    ["papa", "papas", "patata", "patatas"],
    ["puerro"],
    ["rabanito", "rábano", "rabano"],
    ["remolacha", "betabel"],
    ["repollo", "col"],
    ["rúcula", "rucula"],
    ["tomate", "tomates"],
    ["zanahoria", "zanahorias"],
  ].map((group) => group.map(normalize));

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function renderSuggestions() {
    const container = document.querySelector("#popular-ingredients");
    for (const ingredient of suggestions) {
      const button = createElement("button", "ingredient-chip", ingredient);
      button.type = "button";
      button.addEventListener("click", () => {
        searchInput.value = ingredient;
        renderResults(ingredient);
        searchInput.focus();
      });
      container.append(button);
    }
  }

  function createCard(recipe) {
    const card = createElement("article", "recipe-card");
    const main = createElement("div", "recipe-card-main");
    main.append(createElement("span", "card-category", recipe.category || "Receta"));
    main.append(createElement("h3", "", recipe.title));

    const summary = (recipe.vegetables || []).slice(0, 3).join(" · ");
    if (summary) main.append(createElement("p", "card-description", summary));

    const footer = createElement("div", "recipe-card-footer");
    footer.append(createElement("span", "", `Pág. ${recipe.page}`));
    const openButton = createElement("button", "open-recipe", "Ver receta →");
    openButton.type = "button";
    openButton.setAttribute("aria-label", `Ver receta: ${recipe.title}`);
    openButton.addEventListener("click", () => openRecipe(recipe));
    footer.append(openButton);

    card.append(main, footer);
    return card;
  }

  function renderResults(query = searchInput.value) {
    const normalizedQuery = normalize(query);
    const queryGroup = vegetableGroups.find((group) => group.includes(normalizedQuery)) || [normalizedQuery];
    const matches = normalizedQuery
      ? recipes.filter((recipe) => {
          const searchableText = normalize([recipe.title, ...(recipe.vegetables || [])].join(" "));
          return queryGroup.some((term) => searchableText.includes(term));
        })
      : recipes.slice(0, 6);

    results.replaceChildren();
    resultsCount.textContent = normalizedQuery
      ? `${matches.length} ${matches.length === 1 ? "página con recetas" : "páginas con recetas"}`
      : recipes.length
        ? `Mostrando ${matches.length} de ${recipes.length}`
        : "";
    searchMessage.textContent = normalizedQuery
      ? matches.length
        ? `Páginas del recetario que contienen «${query.trim()}».`
        : ""
      : "";

    if (!recipes.length) {
      const empty = createElement("div", "empty-state");
      empty.append(createElement("strong", "", "No se pudo cargar el recetario"));
      empty.append(createElement("span", "", "Comprueba que el archivo recipes.js esté junto a esta página."));
      results.append(empty);
      return;
    }

    if (!matches.length) {
      const empty = createElement("div", "empty-state");
      empty.append(createElement("strong", "", "Todavía no encontramos esa verdura"));
      empty.append(createElement("span", "", "Prueba con otro ingrediente o revisa las sugerencias."));
      results.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const recipe of matches) fragment.append(createCard(recipe));
    results.append(fragment);
  }

  function fillList(container, entries, emptyMessage) {
    container.replaceChildren();
    for (const entry of entries || []) {
      container.append(createElement("li", "", entry));
    }
    if (!entries || !entries.length) {
      container.append(createElement("li", "", emptyMessage));
    }
  }

  async function renderPdfPage(pageNumber) {
    if (activePdfRenderTask) {
      activePdfRenderTask.cancel();
      activePdfRenderTask = null;
    }
    const sequence = ++renderSequence;
    pdfError.hidden = true;
    recipeImagePanel.classList.remove("pdf-error-visible");
    recipePage.removeAttribute("style");
    recipePage.width = 1;
    recipePage.height = 1;

    if (!pdfjs) {
      throw new Error("No se pudo cargar el visor PDF.");
    }

    pdfDocumentPromise ||= pdfjs.getDocument(pdfName).promise;
    const pdfDocument = await pdfDocumentPromise;
    const page = await pdfDocument.getPage(pageNumber);
    if (sequence !== renderSequence || !dialog.open) return;

    const frame = document.querySelector(".pdf-page-frame");
    const baseViewport = page.getViewport({ scale: 1 });
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const scale = isMobile
      ? frame.clientHeight / baseViewport.height
      : Math.min(
          frame.clientWidth / baseViewport.width,
          frame.clientHeight / baseViewport.height
        );
    const viewport = page.getViewport({ scale });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    recipePage.width = Math.ceil(viewport.width * outputScale);
    recipePage.height = Math.ceil(viewport.height * outputScale);
    recipePage.style.width = `${viewport.width}px`;
    recipePage.style.height = `${viewport.height}px`;

    const context = recipePage.getContext("2d");
    if (!context) {
      throw new Error("No se pudo preparar el visor del recetario.");
    }

    const renderTask = page.render({
      canvasContext: context,
      viewport,
      transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
    });
    activePdfRenderTask = renderTask;
    try {
      await renderTask.promise;
      if (sequence === renderSequence && isMobile) {
        frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2;
      }
    } catch (error) {
      if (sequence !== renderSequence) return;
      throw error;
    } finally {
      if (activePdfRenderTask === renderTask) activePdfRenderTask = null;
    }
  }

  function openRecipe(recipe) {
    document.querySelector("#dialog-category").textContent = recipe.category || "Receta";
    document.querySelector("#dialog-title").textContent = recipe.title;
    document.querySelector("#dialog-meta").textContent = `Página ${recipe.page} del recetario`;
    fillList(
      document.querySelector("#dialog-vegetables"),
      recipe.vegetables,
      "Consulta la página original para ver todos los ingredientes."
    );

    document.querySelector("#dialog-page-label").textContent = `PÁGINA ${recipe.page}`;
    recipePage.setAttribute("aria-label", `Página ${recipe.page} del recetario`);
    const pageUrl = `${pdfName}#page=${recipe.page}`;
    document.querySelector("#open-pdf-page").href = pageUrl;
    activePdfPage = recipe.page;
    dialog.showModal();
    renderPdfPage(recipe.page).catch((error) => {
      console.error("No se pudo mostrar la página del recetario.", error);
      if (!dialog.open) return;
      pdfError.textContent =
        "No se pudo cargar la página. Puedes abrirla directamente en el recetario.";
      pdfError.hidden = false;
      recipeImagePanel.classList.add("pdf-error-visible");
    });
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResults(searchInput.value);
  });
  searchInput.addEventListener("input", () => renderResults(searchInput.value));
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    renderSequence += 1;
    activePdfPage = null;
    if (activePdfRenderTask) {
      activePdfRenderTask.cancel();
      activePdfRenderTask = null;
    }
    recipePage.width = 1;
    recipePage.height = 1;
    recipePage.removeAttribute("style");
  });
  window.addEventListener("resize", () => {
    if (!dialog.open || activePdfPage === null) return;
    renderPdfPage(activePdfPage).catch((error) => {
      console.error("No se pudo redimensionar la página del recetario.", error);
      if (!dialog.open) return;
      pdfError.textContent =
        "No se pudo ajustar la página. Puedes abrirla directamente en el recetario.";
      pdfError.hidden = false;
      recipeImagePanel.classList.add("pdf-error-visible");
    });
  });

  renderSuggestions();
  renderResults("");
})();
