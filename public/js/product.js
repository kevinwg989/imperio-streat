// Lógica da Página de Detalhe do Produto - IMPÉRIO STREETWEAR

let currentProduct = null;
let selectedVariant = null;
let currentQuantity = 1;

function getSlugFromUrl() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'produto') {
    return pathParts[1];
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || pathParts[pathParts.length - 1];
}

async function loadProductDetail() {
  const slug = getSlugFromUrl();
  const container = document.getElementById('productDetailContainer');
  if (!slug || !container) return;

  try {
    const res = await API.getProductBySlug(slug);
    if (!res.success || !res.data) {
      container.innerHTML = `
        <div style="text-align: center; padding: 5rem 1rem;">
          <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Produto não encontrado</h2>
          <p style="margin-bottom: 2rem;">A peça que você procura pode ter esgotado ou sido removida.</p>
          <a href="/catalogo" class="btn btn-primary">Explorar Catálogo</a>
        </div>
      `;
      return;
    }

    currentProduct = res.data;
    renderProductView(currentProduct);
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 5rem 1rem; color: #ef4444;">
        <p>Erro ao carregar detalhes do produto. Tente novamente.</p>
      </div>
    `;
  }
}

function renderProductView(p) {
  const container = document.getElementById('productDetailContainer');
  if (!container) return;

  const isDemo = p.is_demo === 1;
  const inStock = p.in_stock;
  const images = p.images && p.images.length > 0 ? p.images : ['/assets/images/placeholder.svg'];

  // Agrupar variantes por tamanho e cor
  const uniqueSizes = [...new Set(p.variants.map(v => v.size))];
  const uniqueColors = [...new Set(p.variants.map(v => v.color))];

  // Pré-selecionar primeira variante com estoque
  selectedVariant = p.variants.find(v => v.stock_quantity > 0) || p.variants[0] || null;

  document.title = `${p.name} | IMPÉRIO STREETWEAR`;

  container.innerHTML = `
    <div class="product-detail-layout">
      <!-- Galeria de Imagens -->
      <div class="product-gallery">
        <div class="main-image-wrap">
          <img id="mainProductImage" src="${images[0]}" alt="${p.name}">
        </div>
        ${images.length > 1 ? `
          <div class="gallery-thumbs">
            ${images.map((img, idx) => `
              <button class="gallery-thumb-btn ${idx === 0 ? 'active' : ''}" onclick="switchProductImage('${img}', this)">
                <img src="${img}" alt="Miniatura ${idx + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Informações & Ações -->
      <div class="product-summary-info">
        <div>
          <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--silver-accent); letter-spacing: 0.1em;">
            ${p.category_name || 'Coleção Urbana'}
          </span>
          <h1 style="font-size: clamp(1.8rem, 3vw, 2.4rem); text-transform: uppercase; margin-top: 0.35rem; line-height: 1.15;">
            ${p.name}
          </h1>
        </div>

        <!-- Alerta de Demonstração Conforme Diretrizes -->
        ${isDemo ? `
          <div class="product-demo-alert">
            <svg style="width: 22px; height: 22px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <strong>Amostra Demonstrativa de Catálogo (Pré-Lançamento)</strong>
              <p style="font-size: 0.8rem; margin-top: 4px; color: #FDE68A;">
                Este produto faz parte da demonstração de catálogo da Império Streetwear. Não está liberado para compra direta até que o fornecedor, custo e estoque definitivo sejam confirmados no painel administrativo.
              </p>
            </div>
          </div>
        ` : `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-stock">Disponível para Teste & Envio</span>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${p.total_stock} unidades prontas</span>
          </div>
        `}

        <!-- Bloco de Preços -->
        <div style="display: flex; align-items: baseline; gap: 1rem; border-bottom: 1px solid var(--silver-border); padding-bottom: 1.5rem;">
          <span style="font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: #FFFFFF;">
            ${API.formatBRL(p.price)}
          </span>
          ${p.compare_at_price ? `
            <span style="font-size: 1.1rem; color: var(--text-dim); text-decoration: line-through;">
              ${API.formatBRL(p.compare_at_price)}
            </span>
          ` : ''}
          <span style="font-size: 0.85rem; color: var(--accent-green); font-weight: 600;">
            5% OFF no Pix ou até 3x de ${API.formatBRL(p.price / 3)}
          </span>
        </div>

        <!-- Seletor de Cores -->
        ${uniqueColors.length > 0 ? `
          <div>
            <label class="form-label">Cor: <span id="selectedColorName" style="color: #FFFFFF;">${selectedVariant ? selectedVariant.color : uniqueColors[0]}</span></label>
            <div class="color-options" style="margin-top: 0.4rem;">
              ${uniqueColors.map(color => {
                const sampleVar = p.variants.find(v => v.color === color);
                const isSelected = selectedVariant && selectedVariant.color === color;
                return `
                  <button class="color-pill ${isSelected ? 'active' : ''}" onclick="selectColor('${color}', this)">
                    <span class="color-dot" style="background-color: ${sampleVar?.color_hex || '#000000'};"></span>
                    <span>${color}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Seletor de Tamanhos -->
        <div class="size-selector-wrap">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="form-label">Tamanho: <span id="selectedSizeLabel" style="color: #FFFFFF;">${selectedVariant ? selectedVariant.size : ''}</span></label>
            <span style="font-size: 0.75rem; color: var(--silver-accent);">Tabela de Medidas Streetwear</span>
          </div>
          <div class="size-options">
            ${uniqueSizes.map(size => {
              const matchingVar = p.variants.find(v => v.size === size && (!selectedVariant || v.color === selectedVariant.color));
              const isSelected = selectedVariant && selectedVariant.size === size;
              const hasStock = matchingVar ? matchingVar.stock_quantity > 0 : false;

              return `
                <button 
                  class="size-pill ${isSelected ? 'active' : ''} ${!hasStock ? 'disabled' : ''}" 
                  ${!hasStock ? 'disabled title="Sem estoque neste tamanho"' : ''}
                  onclick="selectSize('${size}', this)">
                  ${size}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Quantidade e Botão de Adicionar à Sacola -->
        <div style="display: flex; gap: 1rem; align-items: center;">
          <div class="qty-stepper" style="height: 52px; padding: 0 0.5rem;">
            <button class="qty-btn" style="font-size: 1.2rem;" onclick="changeProductQty(-1)">−</button>
            <span class="qty-val" id="productQtyDisplay" style="font-size: 1rem; font-weight: 700;">1</span>
            <button class="qty-btn" style="font-size: 1.2rem;" onclick="changeProductQty(1)">+</button>
          </div>

          <button 
            id="addToBagBtn"
            class="btn btn-primary btn-block btn-lg" 
            style="flex: 1; height: 52px;"
            ${isDemo ? 'disabled' : ''}
            onclick="handleAddToBag()">
            ${isDemo ? 'Indisponível (Amostra de Catálogo)' : (inStock ? 'Adicionar à Sacola' : 'Esgotado')}
          </button>
        </div>

        <!-- Simulador de Frete com Busca de CEP -->
        <div class="shipping-calc-box">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <svg style="width: 18px; height: 18px; color: var(--silver-accent);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase;">Simular Frete & Prazo</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="shippingCepInput" class="form-control" placeholder="00000-000" maxlength="9" style="max-width: 170px;">
            <button class="btn btn-secondary btn-sm" onclick="simulateProductShipping()">Calcular</button>
          </div>
          <div id="shippingResultDisplay" style="font-size: 0.8rem; display: none; line-height: 1.5; color: var(--silver-accent); padding-top: 0.5rem; border-top: 1px solid var(--silver-border);"></div>
        </div>

        <!-- Descrição e Detalhes da Peça -->
        <div style="margin-top: 1rem; border-top: 1px solid var(--silver-border); padding-top: 1.5rem;">
          <h4 style="font-size: 0.95rem; text-transform: uppercase; margin-bottom: 0.75rem;">Descrição da Peça</h4>
          <p style="font-size: 0.9rem; line-height: 1.7; color: var(--silver-accent); margin-bottom: 1.25rem;">
            ${p.description || 'Peça streetwear exclusiva com caimento impecável.'}
          </p>

          ${p.details ? `
            <h4 style="font-size: 0.95rem; text-transform: uppercase; margin-bottom: 0.5rem;">Especificações & Tecido</h4>
            <p style="font-size: 0.85rem; line-height: 1.6; color: var(--text-muted);">
              ${p.details}
            </p>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function switchProductImage(src, btn) {
  const main = document.getElementById('mainProductImage');
  if (main) main.src = src;
  document.querySelectorAll('.gallery-thumb-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function selectSize(size, btn) {
  if (!currentProduct) return;
  const currentColor = selectedVariant ? selectedVariant.color : null;
  const match = currentProduct.variants.find(v => v.size === size && (!currentColor || v.color === currentColor))
             || currentProduct.variants.find(v => v.size === size);

  if (match) {
    selectedVariant = match;
    document.querySelectorAll('.size-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const label = document.getElementById('selectedSizeLabel');
    if (label) label.textContent = size;
  }
}

function selectColor(color, btn) {
  if (!currentProduct) return;
  const currentSize = selectedVariant ? selectedVariant.size : null;
  const match = currentProduct.variants.find(v => v.color === color && (!currentSize || v.size === currentSize))
             || currentProduct.variants.find(v => v.color === color);

  if (match) {
    selectedVariant = match;
    document.querySelectorAll('.color-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const label = document.getElementById('selectedColorName');
    if (label) label.textContent = color;
  }
}

function changeProductQty(delta) {
  currentQuantity = Math.max(1, currentQuantity + delta);
  if (selectedVariant && selectedVariant.stock_quantity && currentQuantity > selectedVariant.stock_quantity) {
    currentQuantity = selectedVariant.stock_quantity;
    if (window.UI) UI.showToast(`Estoque máximo disponível: ${selectedVariant.stock_quantity}`, 'warning');
  }
  const display = document.getElementById('productQtyDisplay');
  if (display) display.textContent = currentQuantity;
}

function handleAddToBag() {
  if (!currentProduct || !selectedVariant) {
    if (window.UI) UI.showToast('Por favor, selecione um tamanho válido.', 'warning');
    return;
  }

  if (currentProduct.is_demo === 1) {
    if (window.UI) {
      UI.showToast('Amostra de catálogo: esta peça ainda aguarda liberação de fornecedor e não está à venda.', 'warning');
    }
    return;
  }

  Cart.addItem(currentProduct, selectedVariant, currentQuantity);
}

// Simulador de Frete no Detalhe do Produto
async function simulateProductShipping() {
  const input = document.getElementById('shippingCepInput');
  const resultDiv = document.getElementById('shippingResultDisplay');
  if (!input || !resultDiv) return;

  const rawCep = input.value.replace(/\D/g, '');
  if (rawCep.length !== 8) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="color: #ef4444;">Digite um CEP válido com 8 dígitos.</span>';
    return;
  }

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = 'Consultando prazos dos Correios...';

  try {
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
    const address = await viaCepRes.json();

    if (address.erro) {
      resultDiv.innerHTML = '<span style="color: #ef4444;">CEP não encontrado na base dos Correios.</span>';
      return;
    }

    const price = currentProduct ? currentProduct.price : 140;
    const isFree = price >= 299;

    resultDiv.innerHTML = `
      <div style="margin-bottom: 4px;"><strong>${address.localidade} - ${address.uf}</strong> (${address.bairro || 'Centro'})</div>
      <div style="display: flex; justify-content: space-between; margin-top: 6px;">
        <span>PAC Padrão (5 a 8 dias úteis):</span>
        <strong>${isFree ? '<span style="color: #10b981;">GRÁTIS</span>' : 'R$ 19,90'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <span>SEDEX Express (2 a 4 dias úteis):</span>
        <strong>${isFree ? 'R$ 15,00' : 'R$ 34,90'}</strong>
      </div>
    `;
  } catch (e) {
    resultDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span>PAC Padrão (5 a 8 dias úteis):</span>
        <strong>R$ 19,90</strong>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('productDetailContainer')) {
    loadProductDetail();
  }
});
