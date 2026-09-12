/**
 * Print a DOM element through a hidden iframe (port of Vue `utils/Print.js`).
 * Keeps all document styles so the printed output matches the on-screen layout.
 */
function syncFormControls(root: HTMLElement) {
  root.querySelectorAll('input').forEach((input) => {
    const el = input as HTMLInputElement;
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked) el.setAttribute('checked', 'checked');
      else el.removeAttribute('checked');
    } else {
      el.setAttribute('value', el.value);
    }
  });
  root.querySelectorAll('textarea').forEach((textarea) => {
    const el = textarea as HTMLTextAreaElement;
    el.innerHTML = el.value;
  });
  root.querySelectorAll('select').forEach((select) => {
    const el = select as HTMLSelectElement;
    Array.from(el.children).forEach((child) => {
      if (child.tagName === 'OPTION') {
        if ((child as HTMLOptionElement).selected) child.setAttribute('selected', 'selected');
        else child.removeAttribute('selected');
      }
    });
  });
  root.querySelectorAll('canvas').forEach((canvas) => {
    try {
      const imageURL = (canvas as HTMLCanvasElement).toDataURL('image/png');
      const img = document.createElement('img');
      img.src = imageURL;
      const style = canvas.getAttribute('style');
      const className = canvas.getAttribute('class');
      if (style) img.setAttribute('style', style);
      if (className) img.setAttribute('class', className);
      (canvas as HTMLCanvasElement).style.display = 'none';
      canvas.parentNode?.insertBefore(img, canvas.nextElementSibling);
    } catch {
      /* ignore tainted canvas */
    }
  });
}

export function printDom(target: HTMLElement | null | undefined, options?: { noPrint?: string }) {
  if (!target) return;
  const source = target.parentElement || target;
  const noPrint = options?.noPrint || '.no-print';
  const styleStr =
    Array.from(document.querySelectorAll('style,link'))
      .map((el) => el.outerHTML)
      .join('') + `<style>${noPrint}{display:none;}</style>`;

  const iframe = document.createElement('iframe');
  iframe.id = 'wflow-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();
  doc.head.innerHTML = styleStr;
  const holder = doc.createElement('div');
  holder.innerHTML = source.innerHTML;
  syncFormControls(holder);
  doc.body.appendChild(holder);

  const done = () => {
    try {
      const win = iframe.contentWindow;
      win?.focus();
      win?.print();
    } finally {
      setTimeout(() => iframe.remove(), 200);
    }
  };
  if (doc.readyState === 'complete') {
    setTimeout(done, 50);
  } else {
    iframe.onload = () => setTimeout(done, 50);
  }
}
