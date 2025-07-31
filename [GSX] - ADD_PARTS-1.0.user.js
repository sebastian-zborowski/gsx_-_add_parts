// ==UserScript==
// @name         [GSX] - ADD_PARTS
// @version      1.0
// @description  Usprawnione dodawanie części - kilka sesji na raz bez commitu
// @author       Sebastian Zborowski
// @match        https://gsx2.apple.com
// @include      https://gsx2.apple.com/returns/new?from=sp_rtn_ppr_open
// @updateURL    https://raw.githubusercontent.com/sebastian-zborowski/gsx_-_add_parts/main/%5BGSX%5D%20-%20ADD_PARTS-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/sebastian-zborowski/gsx_-_add_parts/main/%5BGSX%5D%20-%20ADD_PARTS-1.0.user.js
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @grant        none
// ==/UserScript==

(function($) {
    'use strict';

    function addButtons(modal) {
        if (!modal || modal.querySelector('#createListButton')) return;

        const $modal = $(modal);
        const $footer = $modal.find('.el-dialog__footer');

        const $container = $footer.length ? $footer : $modal;

        const $buttonContainer = $('<div>', {
            css: {
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '15px',
                marginBottom: '15px'
            }
        });

        const $createButton = $('<button>', {
            id: 'createListButton',
            text: 'NOWA LISTA',
            css: {
                padding: '8px 16px',
                backgroundColor: '#007aff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            click: function () {
                const newWin = window.open('about:blank', '_blank');
                if (newWin) {
                    newWin.document.open();
                    newWin.document.write(localStorageInputPage);
                    newWin.document.close();
                } else {
                    alert('Blokada wyskakujących okienek - proszę zezwolić na otwieranie nowych kart.');
                }
            }
        });

        const $loadButton = $('<button>', {
            id: 'loadFromListButton',
            text: 'WCZYTAJ Z LISTY',
            css: {
                padding: '8px 16px',
                backgroundColor: '#007aff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            click: function () {
                const codes = JSON.parse(localStorage.getItem('GSX_ListCodes') || '[]');
                const hagCodes = codes.filter(code => code.toUpperCase().startsWith('HAG'));
                if (hagCodes.length === 0) {
                    alert('Brak kodów zaczynających się od HAG w localStorage');
                    return;
                }

                const $searchInput = $('input.el-input__inner[data-tid="parts_selector_searchbox"]');
                if ($searchInput.length === 0) {
                    alert('Pole wyszukiwania nie znalezione na stronie');
                    return;
                }
                const input = $searchInput.get(0);

                let currentIndex = 0;

                // Deklarujemy onCheckboxChange tutaj, żeby nie było w if-bloku
                let onCheckboxChange = null;

                function searchNext() {
                    if (currentIndex >= hagCodes.length) {
                        alert('Dodano wszystkie kody z listy lub zatrzymano.');
                        return;
                    }

                    const currentCode = hagCodes[currentIndex];
                    input.value = currentCode;
                    input.focus();
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new KeyboardEvent('keydown', {
                        bubbles: true,
                        cancelable: true,
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13
                    }));

                    setTimeout(() => checkResults(currentCode), 500);
                }

                function checkResults(currentCode, retries = 10) {
                    const $rows = $('div.ag-row[aria-rowindex]:visible');
                    const $noResults = $('div.ag-overlay-no-rows-wrapper:visible span.static-table_blank');

                    if ($noResults.length && $noResults.text().trim() === 'No results found') {
                        input.blur();
                        alert(`Kod ${currentCode} nie istnieje w bazie.`);
                        currentIndex++;
                        setTimeout(searchNext, 300);
                        return;
                    }

                    if ($rows.length === 1) {
                        const $row = $rows.eq(0);
                        const $checkbox = $row.find('input[type="checkbox"].custom-checkbox');
                        if ($checkbox.length && !$checkbox.prop('checked')) {
                            const checkboxElem = $checkbox.get(0);
                            checkboxElem.focus();
                            checkboxElem.click();
                            checkboxElem.blur();
                            $row.addClass('ag-row-selected');
                            currentIndex++;
                            setTimeout(searchNext, 300);
                        } else {
                            currentIndex++;
                            setTimeout(searchNext, 300);
                        }
                    } else if ($rows.length > 1) {
                        alert(`Znaleziono ${$rows.length} elementów dla kodu ${currentCode}. Proszę zaznacz ręcznie.`);

                        // Usuwamy poprzednie nasłuchiwacze, jeśli są
                        if (onCheckboxChange) {
                            $rows.find('input[type="checkbox"].custom-checkbox').off('change', onCheckboxChange);
                        }

                        onCheckboxChange = function(e) {
                            const checkbox = e.target;
                            if (checkbox.checked) {
                                $rows.find('input[type="checkbox"].custom-checkbox').off('change', onCheckboxChange);
                                currentIndex++;
                                searchNext();
                            }
                        };

                        $rows.find('input[type="checkbox"].custom-checkbox').on('change', onCheckboxChange);

                    } else if (retries > 0) {
                        setTimeout(() => checkResults(currentCode, retries - 1), 300);
                    } else {
                        currentIndex++;
                        setTimeout(searchNext, 300);
                    }
                }

                searchNext();
            }
        });

        $buttonContainer.append($createButton, $loadButton);
        $container.append($buttonContainer);
    }

    function init() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.classList.contains('returns-parts-modal')) {
                        addButtons(node);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    const localStorageInputPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NOWA HAG LISTA</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #2c2c2c;
      color: #f0f0f0;
      padding: 20px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .copyright {
      margin-bottom:15px;
      text-align: center;
      color: #3a3a3a;
      margin-top: 30px;
      font-size: 14px;
      font-weight: bold;
      font-family: Arial, sans-serif;
    }
    .container {
      width: 50%;
      min-width: 300px;
      margin-left: 25%;
      margin-right: 25%;
      background-color: #3a3a3a;
      padding: 20px 30px;
      border-radius: 8px;
      box-sizing: border-box;
      box-shadow: 0 0 10px rgba(0,0,0,0.7);
    }
    h2, h3 {
      text-align: center;
      margin-top: 0;
      color: #eaeaea;
    }
    input {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      box-sizing: border-box;
      border-radius: 4px;
      border: none;
      margin-top: 10px;
    }
    .info {
      margin-top: 10px;
      font-size: 14px;
      color: #ccc;
      text-align: center;
      min-height: 20px;
    }
    .list {
      margin-top: 20px;
      background-color: #4a4a4a;
      border-radius: 6px;
      padding: 10px 15px;
    }
    .list ul {
      padding-left: 0;
      list-style: none;
      margin: 0;
    }
    .list li {
      margin-bottom: 6px;
      font-family: monospace;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #5a5a5a;
      padding: 6px 10px;
      border-radius: 4px;
      color: #eee;
    }
    .delete-btn {
      background: none;
      border: none;
      color: #ff6b6b;
      cursor: pointer;
      font-size: 18px;
      transition: color 0.3s ease;
    }
    .delete-btn:hover {
      color: #ff3b30;
    }
    #clearAllBtn {
      display: block;
      margin: 20px auto 0 auto;
      padding: 12px 24px;
      background-color: #ff3b30;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
      transition: background-color 0.3s ease;
    }
    #clearAllBtn:hover {
      background-color: #e02922;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>WKLEJ KOD</h2>
    <input type="text" id="listInput" placeholder="WKLEJ KOD..." />
    <div class="info" id="status"></div>
    <div class="list">
      <h3>ZAPISANE KODY: <span id="codesCount">0</span></h3>
      <ul id="savedCodesList"></ul>
    </div>
    <button id="clearAllBtn">WYCZYŚĆ WSZYSTKO</button>
  <div class="copyright">
    Sebastian Zborowski
  </div>
  </div>
  <script>
    const input = document.getElementById('listInput');
    const status = document.getElementById('status');
    const savedList = document.getElementById('savedCodesList');

    function getSavedCodes() {
      const data = localStorage.getItem('GSX_ListCodes');
      return data ? JSON.parse(data) : [];
    }

    function saveCode(val) {
      const codes = getSavedCodes();
      codes.push(val);
      localStorage.setItem('GSX_ListCodes', JSON.stringify(codes));
    }

    function renderSavedCodes() {
      const codes = getSavedCodes();
      savedList.innerHTML = '';
      document.getElementById('codesCount').textContent = codes.length;

      const counts = {};
      codes.forEach(code => {
        const key = code.toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      });

      const colors = [
        '#fc8803', '#ff1500', '#5b9124', '#1cb07f', '#ce47ff',
        '#8c2058', '#2e3e42', '#537354', '#5e5c24', '#473730'
      ];

      const codeColors = {};
      let colorIndex = 0;

      Object.keys(counts).forEach(code => {
        if (counts[code] > 1) {
          codeColors[code] = colors[colorIndex % colors.length];
          colorIndex++;
        }
      });

      const uniqueCodes = [];
      const duplicateCodesGroups = {};

      codes.forEach(code => {
        const upper = code.toUpperCase();
        if (counts[upper] === 1) {
          uniqueCodes.push(code);
        } else {
          if (!duplicateCodesGroups[upper]) duplicateCodesGroups[upper] = [];
          duplicateCodesGroups[upper].push(code);
        }
      });

      uniqueCodes.forEach((code, index) => {
        const li = document.createElement('li');
        li.textContent = (index + 1) + '. ' + code;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '❌';
        deleteBtn.title = 'Delete this HAG code';
        deleteBtn.addEventListener('click', () => {
          const updatedCodes = getSavedCodes();
          const idx = updatedCodes.indexOf(code);
          if (idx !== -1) {
            updatedCodes.splice(idx, 1);
            localStorage.setItem('GSX_ListCodes', JSON.stringify(updatedCodes));
            renderSavedCodes();
          }
        });

        li.appendChild(deleteBtn);
        savedList.appendChild(li);
      });

      let startIndex = uniqueCodes.length + 1;
      Object.keys(duplicateCodesGroups).forEach(dupCode => {
        const group = duplicateCodesGroups[dupCode];
        const bgColor = codeColors[dupCode];

        group.forEach(code => {
          const li = document.createElement('li');
          li.style.backgroundColor = bgColor;
          li.textContent = (startIndex) + '. ' + code;

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-btn';
          deleteBtn.textContent = '❌';
          deleteBtn.title = 'Delete this HAG code';
          deleteBtn.addEventListener('click', () => {
            const updatedCodes = getSavedCodes();
            const idx = updatedCodes.indexOf(code);
            if (idx !== -1) {
              updatedCodes.splice(idx, 1);
              localStorage.setItem('GSX_ListCodes', JSON.stringify(updatedCodes));
              renderSavedCodes();
            }
          });

          li.appendChild(deleteBtn);
          savedList.appendChild(li);

          startIndex++;
        });
      });
    }

    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (val.length >= 10) {
        const prefix = val.substring(0, 3).toUpperCase();
        if (prefix === 'HAG') {
          saveCode(val);
          status.textContent = 'Zapisano do localStorage ✅';
          input.value = '';
          input.focus();
          renderSavedCodes();
        } else {
          status.textContent = 'Błąd. kod musi zaczynać się od: "HAG" ❌';
        }
      } else {
        status.textContent = '';
      }
    });

    renderSavedCodes();

    const clearBtn = document.getElementById('clearAllBtn');
    clearBtn.addEventListener('click', () => {
      const codes = getSavedCodes();
      const filtered = codes.filter(code => !code.toUpperCase().startsWith('HAG'));
      localStorage.setItem('GSX_ListCodes', JSON.stringify(filtered));
      renderSavedCodes();
      status.textContent = 'Wyczyszczono wszystkie zapisane kody HAG ✅';
    });
  </script>
</body>
</html>
`;

    $(document).ready(() => {
        init();
    });

    // Kontrola wersji alert ---------------------------------------------------------
    (async function() {
        const scriptList = [
            { name: 'ADD_PARTS', url: 'https://raw.githubusercontent.com/sebastian-zborowski/gsx_-_add_parts/main/%5BGSX%5D%20-%20ADD_PARTS-1.0.user.js' },
        ];

        const currentVersions = {
            ADD_PARTS: '1.0',
        };

        await Promise.all(scriptList.map(async script => {
            try {
                const res = await fetch(script.url);
                const text = await res.text();
                const match = text.match(/@version\s+([0-9.]+)/);
                if (match) {
                    const version = match[1];
                    localStorage.setItem(script.name, JSON.stringify({
                        name: script.name,
                        remote: version
                    }));
                    console.log(`[VERSION CONTROL] ${script.name}: ${version}`);
                } else {
                    console.warn(`[VERSION CONTROL] Nie znaleziono wersji dla: ${script.name}`);
                }
            } catch (err) {
                console.warn(`[VERSION CONTROL] Błąd ładowania ${script.name}:`, err);
            }
        }));

        let popupCount = 0;
        scriptList.forEach(script => {
            const storedStr = localStorage.getItem(script.name);
            if (!storedStr) return;
            try {
                const data = JSON.parse(storedStr);
                const remoteVer = data && data.remote;
                const currentVer = currentVersions[script.name] || '0.0';

                if (remoteVer && compareVersions(remoteVer, currentVer) > 0) {
                    showUpdatePopup(script.name, currentVer, remoteVer, popupCount++);
                }
            } catch(e) {
                console.warn(`[UPDATE CHECK] Błąd sprawdzania wersji dla ${script.name}:`, e);
            }
        });

        function compareVersions(v1, v2) {
            const split1 = v1.split('.').map(Number);
            const split2 = v2.split('.').map(Number);
            const length = Math.max(split1.length, split2.length);
            for (let i = 0; i < length; i++) {
                const n1 = split1[i] || 0;
                const n2 = split2[i] || 0;
                if (n1 > n2) return 1;
                if (n1 < n2) return -1;
            }
            return 0;
        }

        function showUpdatePopup(scriptName, current, remote, index) {
            const popup = document.createElement('div');
            popup.textContent = `🔔 Aktualizacja dostępna dla ${scriptName}: ${remote} (masz ${current})`;
            Object.assign(popup.style, {
                position: 'fixed',
                bottom: `${35 + index * 100}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#222',
                color: '#fff',
                padding: '24px 36px',
                borderRadius: '16px',
                fontSize: '18px',
                zIndex: 9999 + index,
                boxShadow: '0 0 20px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'opacity 0.3s ease',
                opacity: '1',
                maxWidth: '90%',
                textAlign: 'center',
            });

            popup.addEventListener('click', () => popup.remove());

            document.body.appendChild(popup);

            setTimeout(() => {
                popup.style.opacity = '0';
                setTimeout(() => popup.remove(), 500);
            }, 7500);
        }
    })();

})(window.jQuery);
