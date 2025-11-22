// tars_db/js/ui.js
export const UI = {
    showLoading(text) {
        const loader = document.getElementById('loader');
        const msg = document.getElementById('loaderMsg');
        if(loader && msg) {
            msg.innerText = text;
            loader.classList.remove('hidden');
        }
    },

    hideLoading() {
        const loader = document.getElementById('loader');
        if(loader) loader.classList.add('hidden');
    },

    showToast(text, type = "success") {
        const container = document.getElementById('toastContainer');
        if(!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = '<i class="fa-solid fa-check-circle"></i>';
        if(type === 'error') {
            icon = '<i class="fa-solid fa-circle-exclamation"></i>';
            toast.style.background = '#e74c3c';
        } else if (type === 'info') {
            icon = '<i class="fa-solid fa-info-circle"></i>';
            toast.style.background = '#3498db';
        }

        toast.innerHTML = `${icon} <span>${text}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    populateSelect(id, opts, currentValue) {
        const el = document.getElementById(id);
        el.innerHTML = "";
        opts.forEach(o => { 
            const op = document.createElement("option"); 
            op.text = o; 
            el.add(op); 
        });
        if(opts.includes(currentValue)) el.value = currentValue;
    }
};