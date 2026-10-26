// Lógica de Checkout - IMPÉRIO STREETWEAR

let currentPaymentMethod = 'checkout_pro';
let selectedShippingOption = 'PAC';

// Máscaras de entrada
function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2');
}

function maskCEP(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCard(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})/g, '$1 ')
    .trim();
}

function maskExpiry(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, '$1/$2');
}

async function lookupCep(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return;

  const streetInput = document.getElementById('checkoutStreet');
  const neighInput = document.getElementById('checkoutNeighborhood');
  const cityInput = document.getElementById('checkoutCity');
  const stateInput = document.getElementById('checkoutState');
  const numInput = document.getElementById('checkoutNumber');

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();

    if (!data.erro) {
      if (streetInput) streetInput.value = data.logradouro || '';
      if (neighInput) neighInput.value = data.bairro || '';
      if (cityInput) cityInput.value = data.localidade || '';
      if (stateInput) stateInput.value = data.uf || '';
      if (numInput) numInput.focus();
      updateOrderSummary();
    }
  } catch (e) {
    console.warn('ViaCEP offline ou inacessível:', e);
  }
}

function selectPaymentMethod(method) {
  currentPaymentMethod = method;
  document.querySelectorAll('.payment-tab-btn').forEach(btn => btn.classList.remove('active'));
  
  let tabId = 'payTabPro';
  if (method === 'pix') tabId = 'payTabPix';
  else if (method === 'cartao_credito') tabId = 'payTabCard';

  const activeBtn = document.getElementById(tabId);
  if (activeBtn) activeBtn.classList.add('active');

  const proDetails = document.getElementById('proDetailsSection');
  const pixDetails = document.getElementById('pixDetailsSection');
  const cardDetails = document.getElementById('cardDetailsSection');

  if (proDetails) proDetails.style.display = method === 'checkout_pro' ? 'block' : 'none';
  if (pixDetails) pixDetails.style.display = method === 'pix' ? 'block' : 'none';
  if (cardDetails) cardDetails.style.display = method === 'cartao_credito' ? 'block' : 'none';

  updateOrderSummary();
}

function selectShipping(method) {
  selectedShippingOption = method;
  updateOrderSummary();
}

function updateOrderSummary() {
  const cart = Cart.getCart();
  const subtotal = Cart.getSubtotal();
  const isFreeThreshold = subtotal >= 299.00;

  let shippingCost = 0;
  if (selectedShippingOption === 'SEDEX') {
    shippingCost = isFreeThreshold ? 15.00 : 34.90;
  } else {
    shippingCost = isFreeThreshold ? 0.00 : 19.90;
  }

  // 5% de desconto promocional no Pix
  const pixDiscount = currentPaymentMethod === 'pix' ? subtotal * 0.05 : 0;
  const total = subtotal + shippingCost - pixDiscount;

  const subtotalEl = document.getElementById('summarySubtotal');
  const shippingEl = document.getElementById('summaryShipping');
  const discountRow = document.getElementById('summaryDiscountRow');
  const discountEl = document.getElementById('summaryDiscount');
  const totalEl = document.getElementById('summaryTotal');

  if (subtotalEl) subtotalEl.textContent = API.formatBRL(subtotal);
  if (shippingEl) shippingEl.textContent = shippingCost === 0 ? 'GRÁTIS' : API.formatBRL(shippingCost);

  if (discountRow && discountEl) {
    if (pixDiscount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `-${API.formatBRL(pixDiscount)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  if (totalEl) totalEl.textContent = API.formatBRL(total);

  // Lista de itens no resumo
  const itemsContainer = document.getElementById('checkoutSummaryItems');
  if (itemsContainer) {
    itemsContainer.innerHTML = cart.map(i => `
      <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.85rem;">
        <img src="${i.image}" alt="${i.name}" style="width: 50px; height: 62px; object-fit: cover; border-radius: var(--radius-xs); background: #18181b;">
        <div style="flex: 1; min-width: 0;">
          <h5 style="font-size: 0.82rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #FFFFFF;">${i.name}</h5>
          <p style="font-size: 0.75rem; color: var(--text-muted);">Tam: ${i.size} • Qtd: ${i.quantity}</p>
        </div>
        <div style="font-size: 0.85rem; font-weight: 700; color: #FFFFFF;">${API.formatBRL(i.price * i.quantity)}</div>
      </div>
    `).join('');
  }
}

async function submitCheckoutOrder(e) {
  if (e) e.preventDefault();

  const cart = Cart.getCart();
  if (cart.length === 0) {
    UI.showToast('Sua sacola está vazia!', 'warning');
    return;
  }

  // Verificar se há produtos demonstrativos
  const hasDemo = cart.some(i => i.is_demo === 1);
  if (hasDemo) {
    UI.showToast('Existem peças demonstrativas (amostras de catálogo) na sacola. Remova-as para prosseguir.', 'error');
    return;
  }

  // Validação dos Campos
  const name = document.getElementById('checkoutName')?.value.trim();
  const email = document.getElementById('checkoutEmail')?.value.trim();
  const cpf = document.getElementById('checkoutCpf')?.value.trim();
  const phone = document.getElementById('checkoutPhone')?.value.trim();

  const zip = document.getElementById('checkoutCep')?.value.trim();
  const street = document.getElementById('checkoutStreet')?.value.trim();
  const number = document.getElementById('checkoutNumber')?.value.trim();
  const complement = document.getElementById('checkoutComplement')?.value.trim();
  const neighborhood = document.getElementById('checkoutNeighborhood')?.value.trim();
  const city = document.getElementById('checkoutCity')?.value.trim();
  const state = document.getElementById('checkoutState')?.value.trim();

  if (!name || !email || !cpf || !phone) {
    UI.showToast('Por favor, preencha todos os dados de identificação.', 'warning');
    return;
  }

  if (cpf.replace(/\D/g, '').length !== 11) {
    UI.showToast('CPF inválido. Digite os 11 dígitos do seu documento.', 'warning');
    return;
  }

  if (!zip || !street || !number || !city || !state) {
    UI.showToast('Por favor, informe o endereço completo de entrega.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('checkoutSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando com Segurança...';
  }

  const orderPayload = {
    customer: {
      name,
      email,
      cpf,
      phone
    },
    shipping_address: {
      zip,
      street,
      number,
      complement,
      neighborhood,
      city,
      state
    },
    shipping_method: selectedShippingOption,
    payment_method: currentPaymentMethod,
    items: cart.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      product_name: item.name
    }))
  };

  try {
    const res = await API.createOrder(orderPayload);
    if (res.success && res.data) {
      Cart.clear();
      // Se for Checkout Pro e houver link do Mercado Pago, redireciona
      if (currentPaymentMethod === 'checkout_pro' && res.data.payment && res.data.payment.init_point && !res.data.payment.is_sandbox) {
        window.location.href = res.data.payment.init_point;
      } else {
        window.location.href = `/pedido/${res.data.order_code}`;
      }
    }
  } catch (err) {
    UI.showToast(err.message || 'Falha ao finalizar o pedido. Verifique os dados.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Finalizar Pedido com Segurança';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    const cart = Cart.getCart();
    if (cart.length === 0) {
      window.location.href = '/catalogo';
      return;
    }

    // Configurar Máscaras
    const cpfInput = document.getElementById('checkoutCpf');
    if (cpfInput) cpfInput.addEventListener('input', (e) => e.target.value = maskCPF(e.target.value));

    const phoneInput = document.getElementById('checkoutPhone');
    if (phoneInput) phoneInput.addEventListener('input', (e) => e.target.value = maskPhone(e.target.value));

    const cepInput = document.getElementById('checkoutCep');
    if (cepInput) {
      cepInput.addEventListener('input', (e) => {
        e.target.value = maskCEP(e.target.value);
        if (e.target.value.replace(/\D/g, '').length === 8) {
          lookupCep(e.target.value);
        }
      });
      cepInput.addEventListener('blur', (e) => lookupCep(e.target.value));
    }

    const cardNumInput = document.getElementById('checkoutCardNumber');
    if (cardNumInput) cardNumInput.addEventListener('input', (e) => e.target.value = maskCard(e.target.value));

    const cardExpInput = document.getElementById('checkoutCardExpiry');
    if (cardExpInput) cardExpInput.addEventListener('input', (e) => e.target.value = maskExpiry(e.target.value));

    updateOrderSummary();
    checkoutForm.addEventListener('submit', submitCheckoutOrder);
  }
});
