(() => {
    'use strict';

    const API = window.location.origin + '/api';

    const CONVERSION_MAP = {
        pdf: ['docx', 'doc', 'odt', 'rtf', 'txt', 'html', 'epub', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'psd'],
        docx: ['pdf', 'doc', 'odt', 'rtf', 'txt', 'html', 'epub', 'png', 'jpg'],
        doc: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html'],
        xlsx: ['pdf', 'csv', 'xls', 'ods', 'html', 'txt'],
        xls: ['pdf', 'xlsx', 'csv', 'ods', 'html'],
        csv: ['xlsx', 'xls', 'pdf', 'ods'],
        pptx: ['pdf', 'ppt', 'odp', 'png', 'jpg'],
        ppt: ['pdf', 'pptx', 'odp', 'png', 'jpg'],
        jpg: ['png', 'pdf', 'bmp', 'tiff', 'gif', 'webp', 'svg', 'heic', 'psd'],
        jpeg: ['png', 'pdf', 'bmp', 'tiff', 'gif', 'webp', 'svg', 'heic', 'psd'],
        png: ['jpg', 'jpeg', 'pdf', 'bmp', 'tiff', 'gif', 'webp', 'svg', 'heic', 'psd'],
        gif: ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp', 'mp4'],
        bmp: ['png', 'jpg', 'jpeg', 'gif', 'tiff', 'webp', 'pdf'],
        tiff: ['png', 'jpg', 'jpeg', 'pdf', 'bmp', 'gif', 'webp'],
        webp: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'pdf'],
        svg: ['png', 'jpg', 'jpeg', 'pdf', 'bmp', 'tiff', 'webp'],
        heic: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'pdf'],
        heif: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'pdf'],
        psd: ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'gif', 'webp', 'pdf'],
        html: ['pdf', 'docx', 'txt'],
        htm: ['pdf', 'docx', 'txt'],
        txt: ['pdf', 'docx', 'html', 'rtf'],
        rtf: ['pdf', 'docx', 'txt', 'html'],
        odt: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'html'],
        ods: ['pdf', 'xlsx', 'csv', 'xls', 'html'],
        epub: ['pdf', 'docx', 'txt'],
        mp3: ['wav', 'ogg', 'flac', 'aac', 'm4a'],
        wav: ['mp3', 'ogg', 'flac', 'aac', 'm4a'],
        ogg: ['mp3', 'wav', 'flac', 'aac'],
        flac: ['mp3', 'wav', 'ogg', 'aac'],
        aac: ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
        m4a: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
        mp4: ['avi', 'mov', 'wmv', 'mkv', 'webm', 'mp3', 'wav', 'gif', 'jpg', 'png'],
        avi: ['mp4', 'mov', 'wmv', 'mkv', 'webm', 'mp3', 'wav'],
        mov: ['mp4', 'avi', 'wmv', 'mkv', 'webm', 'mp3', 'wav'],
        wmv: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'mp3', 'wav'],
        mkv: ['mp4', 'avi', 'mov', 'wmv', 'webm', 'mp3', 'wav'],
        webm: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'mp3', 'wav'],
        ico: ['png', 'jpg', 'bmp'],
    };

    const FORMAT_EXT_MAP = {
        pdf: '.pdf', docx: '.docx', doc: '.doc', odt: '.odt', rtf: '.rtf', txt: '.txt',
        html: '.html', htm: '.htm', epub: '.epub', xlsx: '.xlsx', xls: '.xls',
        csv: '.csv', ods: '.ods', pptx: '.pptx', ppt: '.ppt', odp: '.odp',
        jpg: '.jpg', jpeg: '.jpeg', png: '.png', gif: '.gif', bmp: '.bmp',
        tiff: '.tiff', webp: '.webp', svg: '.svg', heic: '.heic', heif: '.heif',
        psd: '.psd', ico: '.ico', mp3: '.mp3', wav: '.wav', ogg: '.ogg',
        flac: '.flac', aac: '.aac', m4a: '.m4a', wma: '.wma',
        mp4: '.mp4', avi: '.avi', mov: '.mov', wmv: '.wmv', mkv: '.mkv',
        webm: '.webm', flv: '.flv',
    };

    const $ = (sel) => document.getElementById(sel);

    const state = { file: null, converting: false };

    const els = {
        uploadZone: $('uploadZone'),
        fileInput: $('fileInput'),
        fileSelected: $('fileSelected'),
        fileName: $('fileName'),
        fileSize: $('fileSize'),
        removeFile: $('removeFile'),
        formatRow: $('formatRow'),
        fromFormat: $('fromFormat'),
        toFormat: $('toFormat'),
        convertBtn: $('convertBtn'),
        progressWrap: $('progressWrap'),
        progressFill: $('progressFill'),
        progressLabel: $('progressLabel'),
        successWrap: $('successWrap'),
        downloadBtn: $('downloadBtn'),
        newConversion: $('newConversion'),
        errorWrap: $('errorWrap'),
        errorText: $('errorText'),
        retryBtn: $('retryBtn'),
    };

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getExt(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    function detectFormat(filename) {
        const ext = getExt(filename);
        for (const [fmt, exts] of Object.entries(FORMAT_EXT_MAP)) {
            if (exts === '.' + ext) return fmt;
        }
        return null;
    }

    function getCompatibleFormats(source) {
        return CONVERSION_MAP[source] || [];
    }

    function show(el) { el.classList.remove('hidden'); }
    function hide(el) { el.classList.add('hidden'); }

    function resetAll() {
        state.file = null;
        els.fileInput.value = '';
        show(els.uploadZone);
        hide(els.fileSelected);
        hide(els.formatRow);
        hide(els.convertBtn);
        hide(els.progressWrap);
        hide(els.successWrap);
        hide(els.errorWrap);
        els.progressFill.style.width = '0%';
    }

    function showError(msg) {
        hide(els.progressWrap);
        hide(els.convertBtn);
        els.errorText.textContent = msg;
        show(els.errorWrap);
    }

    function populateFromFormat(fmt) {
        els.fromFormat.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = fmt;
        opt.textContent = fmt.toUpperCase();
        els.fromFormat.appendChild(opt);
        els.fromFormat.disabled = true;
    }

    function populateToFormats(source) {
        els.toFormat.innerHTML = '<option value="">Selecione...</option>';
        const compat = getCompatibleFormats(source);
        compat.forEach(fmt => {
            const opt = document.createElement('option');
            opt.value = fmt;
            opt.textContent = fmt.toUpperCase();
            els.toFormat.appendChild(opt);
        });
    }

    function handleFile(file) {
        if (file.size > 200 * 1024 * 1024) {
            alert('Arquivo muito grande. Maximo: 200MB');
            return;
        }

        state.file = file;
        const fmt = detectFormat(file.name);

        els.fileName.textContent = file.name;
        els.fileSize.textContent = formatBytes(file.size);

        hide(els.uploadZone);
        show(els.fileSelected);
        show(els.formatRow);
        show(els.convertBtn);
        hide(els.successWrap);
        hide(els.errorWrap);

        if (fmt) {
            populateFromFormat(fmt);
            populateToFormats(fmt);
        } else {
            els.fromFormat.innerHTML = '<option value="">Detectar...</option>';
            els.fromFormat.disabled = false;
            els.toFormat.innerHTML = '<option value="">Selecione...</option>';
        }
    }

    els.uploadZone.addEventListener('click', () => els.fileInput.click());

    els.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.uploadZone.classList.add('dragover');
    });

    els.uploadZone.addEventListener('dragleave', () => {
        els.uploadZone.classList.remove('dragover');
    });

    els.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    els.fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    els.removeFile.addEventListener('click', resetAll);

    els.fromFormat.addEventListener('change', () => {
        if (els.fromFormat.value) populateToFormats(els.fromFormat.value);
    });

    els.convertBtn.addEventListener('click', startConversion);

    els.newConversion.addEventListener('click', resetAll);
    els.retryBtn.addEventListener('click', resetAll);

    async function startConversion() {
        if (!state.file || !toFormat.value) {
            alert('Selecione o formato de saida');
            return;
        }

        const targetFormat = els.toFormat.value;
        const sourceFormat = els.fromFormat.value || detectFormat(state.file.name);

        if (!sourceFormat) {
            alert('Nao foi possivel detectar o formato');
            return;
        }

        if (sourceFormat === targetFormat) {
            alert('Formato de saida deve ser diferente');
            return;
        }

        state.converting = true;
        hide(els.convertBtn);
        show(els.progressWrap);
        els.progressLabel.textContent = 'Enviando arquivo...';

        try {
            const formData = new FormData();
            formData.append('file', state.file);
            formData.append('format', targetFormat);

            let progress = 0;
            const interval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 12;
                    els.progressFill.style.width = Math.min(progress, 90) + '%';
                }
            }, 250);

            const response = await fetch(`${API}/convert`, { method: 'POST', body: formData });

            clearInterval(interval);

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Erro ${response.status}`);
            }

            const blob = await response.blob();
            const disposition = response.headers.get('content-disposition');
            let downloadName = `${state.file.name.split('.')[0]}_convertido${FORMAT_EXT_MAP[targetFormat] || '.' + targetFormat}`;

            if (disposition) {
                const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match) downloadName = match[1].replace(/['"]/g, '');
            }

            els.progressFill.style.width = '100%';
            els.progressLabel.textContent = 'Conversao concluida!';

            setTimeout(() => {
                const url = URL.createObjectURL(blob);
                els.downloadBtn.href = url;
                els.downloadBtn.download = downloadName;
                hide(els.progressWrap);
                show(els.successWrap);
                state.converting = false;
            }, 400);

        } catch (error) {
            console.error('Erro:', error);
            showError(error.message || 'Erro durante a conversao');
            state.converting = false;
        }
    }

    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const from = btn.dataset.from;
            const to = btn.dataset.to;

            populateFromFormat(from);
            populateToFormats(from);

            setTimeout(() => {
                els.toFormat.value = to;
            }, 50);

            els.uploadZone.click();
        });
    });
})();
