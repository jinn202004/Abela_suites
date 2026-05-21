/**
 * Reusable policy modal — centered overlay, fade/slide animation, accessible controls.
 */
export class PolicyModal {
  /** @type {PolicyModal | null} */
  static #instance = null;

  /** @returns {PolicyModal} */
  static getInstance() {
    if (!PolicyModal.#instance) {
      PolicyModal.#instance = new PolicyModal();
    }
    return PolicyModal.#instance;
  }

  constructor() {
    this.isOpen = false;
    this.activePolicyId = null;
    this.onCloseCallback = null;
    this.previousFocus = null;
    this.#build();
    this.#bind();
  }

  #build() {
    this.root = document.createElement("div");
    this.root.className = "ta-policy-modal";
    this.root.setAttribute("aria-hidden", "true");
    this.root.innerHTML = `
      <div class="ta-policy-modal__overlay" data-ta-modal-dismiss tabindex="-1"></div>
      <div
        class="ta-policy-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ta-policy-modal-title"
      >
        <header class="ta-policy-modal__header">
          <h2 id="ta-policy-modal-title" class="ta-policy-modal__title"></h2>
          <button type="button" class="ta-policy-modal__close" aria-label="Close policy">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div class="ta-policy-modal__body" tabindex="0"></div>
      </div>
    `;
    document.body.appendChild(this.root);
    this.overlay = this.root.querySelector(".ta-policy-modal__overlay");
    this.dialog = this.root.querySelector(".ta-policy-modal__dialog");
    this.titleEl = this.root.querySelector(".ta-policy-modal__title");
    this.bodyEl = this.root.querySelector(".ta-policy-modal__body");
    this.closeBtn = this.root.querySelector(".ta-policy-modal__close");
  }

  #bind() {
    this.closeBtn.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", () => this.close());
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    document.addEventListener("keydown", this.#onKeydown);
  }

  #onKeydown = (e) => {
    if (!this.isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }
    if (e.key === "Tab") this.#trapFocus(e);
  };

  #trapFocus(e) {
    const focusable = this.dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const nodes = Array.from(focusable).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * @param {{ id: string, title: string, html: string, onClose?: (id: string) => void }} opts
   */
  open(opts) {
    const { id, title, html, onClose } = opts;
    if (this.isOpen && this.activePolicyId === id) return;

    this.previousFocus = document.activeElement;
    this.activePolicyId = id;
    this.onCloseCallback = onClose || null;
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = html;
    this.bodyEl.scrollTop = 0;

    this.root.classList.add("ta-policy-modal--open");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("ta-policy-modal-open");
    this.isOpen = true;

    requestAnimationFrame(() => {
      this.root.classList.add("ta-policy-modal--visible");
      this.closeBtn.focus();
    });
  }

  close() {
    if (!this.isOpen) return;
    const closedId = this.activePolicyId;
    this.root.classList.remove("ta-policy-modal--visible");
    this.isOpen = false;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      this.root.classList.remove("ta-policy-modal--open");
      this.root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("ta-policy-modal-open");
      this.bodyEl.innerHTML = "";
      if (typeof this.onCloseCallback === "function" && closedId) {
        this.onCloseCallback(closedId);
      }
      this.activePolicyId = null;
      this.onCloseCallback = null;
      if (this.previousFocus && typeof this.previousFocus.focus === "function") {
        this.previousFocus.focus();
      }
    };

    this.dialog.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 320);
  }

  destroy() {
    document.removeEventListener("keydown", this.#onKeydown);
    this.root.remove();
    PolicyModal.#instance = null;
  }
}
