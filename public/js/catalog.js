// Lógica do Catálogo - IMPÉRIO STREETWEAR

let currentFilters = {
  category: '',
  search: '',
  sort: 'newest',
  min_price: '',
  max_price: '',
  page: 1
};

function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('category')) currentFilters.category = params.get('category');
  if (params.has('search')) currentFilters.search = params.get('search');
  if (params.has('sort')) currentFilters.sort = params.get('sort');
}

async function loadCatalogCategories() {
  const container = document.getElementById('catalogCategoryFilters');
  if (!container) return;

  try {
    const res = await API.getCategories();
    if (res.success && res.data) {
      const allActive = !currentFilters.category ? 'active' : '';
      let html = `
        <button class="filter-btn-link ${allActive}" onclick="applyCategoryFilter('')">
          <span>Todos os Produtos</span>
        </button>
      `;

      res.data.forEach(cat => {
        const isActive = currentFilters.category === cat.slug ? 'active' : '';
        html += `
          <button class="filter-btn-link ${isActive}" onclick="applyCategoryFilter('${cat.slug}')">
            <span>${cat.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">${cat.product_count || 0}</span>
          </button>
        `;
      });

      container.innerHTML = html;
    }
  } catch (err) {
    console.error('Erro ao carregar categorias do catálogo:', err);
  }
}

async function fetchAndRenderProducts() {
  const grid = document.getElementById('catalogProductsGrid');
  const countEl = document.getElementById('catalogResultsCount');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted);">
      <p>Carregando catálogo streetwear...</p>
    </div>
  `;

  try {
    const res = await API.getProducts(currentFilters);
    if (!res.success || !res.data || res.data.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: var(--bg-surface); border: 1px solid var(--silver-border); border-radius: var(--radius-sm);">
          <svg style="width: 48px; height: 48px; stroke: var(--text-dim); fill: none; margin-bottom: 1rem;" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3 style="font-size: 1.2rem; color: #FFFFFF; margin-bottom: 0.5rem;">Nenhum produto encontrado</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.5rem;">Tente ajustar os filtros ou pesquisar por outro termo.</p>
          <button class="btn btn-outline btn-sm" onclick="clearAllFilters()">Limpar Filtros</button>
        </div>
      `;
      if (countEl) countEl.textContent = '0 produtos';
      return;
    }

    if (countEl) {
      countEl.textContent = `${res.pagination.total} produto${res.pagination.total > 1 ? 's' : ''}`;
    }

    grid.innerHTML = res.data.map(renderProductCardHTML).join('');
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #EF4444;">
        <p>Falha ao conectar com o catálogo. Tente novamente mais tarde.</p>
      </div>
    `;
  }
}

function applyCategoryFilter(catSlug) {
  currentFilters.category = catSlug;
  currentFilters.page = 1;
  updateUrl();
  loadCatalogCategories();
  fetchAndRenderProducts();
}

function applySort(sortVal) {
  currentFilters.sort = sortVal;
  updateUrl();
  fetchAndRenderProducts();
}

function applySearch(searchVal) {
  currentFilters.search = searchVal.trim();
  currentFilters.page = 1;
  updateUrl();
  fetchAndRenderProducts();
}

function clearAllFilters() {
  currentFilters = {
    category: '',
    search: '',
    sort: 'newest',
    min_price: '',
    max_price: '',
    page: 1
  };
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) searchInput.value = '';
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) sortSelect.value = 'newest';
  updateUrl();
  loadCatalogCategories();
  fetchAndRenderProducts();
}

function updateUrl() {
  const params = new URLSearchParams();
  if (currentFilters.category) params.set('category', currentFilters.category);
  if (currentFilters.search) params.set('search', currentFilters.search);
  if (currentFilters.sort && currentFilters.sort !== 'newest') params.set('sort', currentFilters.sort);

  const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  window.history.replaceState({}, '', newUrl);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('catalogProductsGrid')) {
    readUrlParams();
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput && currentFilters.search) {
      searchInput.value = currentFilters.search;
    }
    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect && currentFilters.sort) {
      sortSelect.value = currentFilters.sort;
    }

    loadCatalogCategories();
    fetchAndRenderProducts();
  }
});
