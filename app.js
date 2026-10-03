(() => {
  "use strict";

  const recipes = Array.isArray(window.RECIPES) ? window.RECIPES : [];
  const searchForm = document.querySelector(".search-form");
  const searchInput = document.querySelector("#ingredient-search");
  const results = document.querySelector("#recipe-results");
  const resultsCount = document.querySelector("#results-count");
  const searchMessage = document.querySelector("#search-message");
  const dialog = document.querySelector("#recipe-dialog");
  const pdfName =
    "https://github.com/fernandochiappero-ui/app-recetas/releases/latest/download/EBOOK%20RESETEO%20ABDOMINAL.pdf";
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

  function openRecipe(recipe) {
    document.querySelector("#dialog-category").textContent = recipe.category || "Receta";
    document.querySelector("#dialog-title").textContent = recipe.title;
    document.querySelector("#dialog-meta").textContent = `Página ${recipe.page} del recetario`;
    fillList(
      document.querySelector("#dialog-vegetables"),
      recipe.vegetables,
      "Consulta la página original para ver todos los ingredientes."
    );

    const pageUrl = `${pdfName}#page=${recipe.page}&toolbar=0&navpanes=0&view=FitH`;
    document.querySelector("#dialog-page-label").textContent = `PÁGINA ${recipe.page}`;
    document.querySelector("#recipe-page").src = pageUrl;
    document.querySelector("#open-pdf-page").href = pageUrl;
    dialog.showModal();
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
    document.querySelector("#recipe-page").src = "about:blank";
  });

  renderSuggestions();
  renderResults("");
})();
