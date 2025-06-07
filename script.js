document.addEventListener('DOMContentLoaded', () => {
    // Variável para armazenar o evento beforeinstallprompt para PWA
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('O evento beforeinstallprompt foi disparado. Você pode mostrar seu botão de instalação agora.');
    });

    // Lógica para a página inicial (index.html)
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', () => {
            window.location.href = 'materias.html'; // Redireciona para a página de matérias
        });
    }

    // Lógica para as páginas de matérias (materias.html)
    const materialCards = document.querySelectorAll('.material-card');
    if (materialCards.length > 0) {
        materialCards.forEach(card => {
            card.addEventListener('click', () => {
                const subject = card.dataset.subject; // Pega o valor do atributo data-subject (ex: "biologia")
                if (subject) {
                    window.location.href = `${subject}.html`; // Redireciona para a página da matéria correspondente
                }
            });
        });
    }

    // Lógica para as páginas de flashcards (biologia.html, etc.)
    const flashcardElement = document.querySelector('.flashcard');
    const flipButton = document.getElementById('flipFlashcard');
    const prevButton = document.getElementById('prevFlashcard');
    const nextButton = document.getElementById('nextFlashcard');
    const currentFlashcardIndexSpan = document.getElementById('currentFlashcardIndex');
    const totalFlashcardsSpan = document.getElementById('totalFlashcards');

    // Elementos para a funcionalidade de geração de flashcards
    const topicInput = document.getElementById('topicInput');
    const generateFlashcardsButton = document.getElementById('generateFlashcardsButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Elementos para a funcionalidade de Anotações/Bloco de Notas (agora com TinyMCE)
    const notesInputTarget = document.getElementById('tinymce-editor'); // Alvo para o TinyMCE
    const saveNotesButton = document.getElementById('saveNotesButton');
    const notesStatus = document.getElementById('notesStatus');
    const subjectSelect = document.getElementById('subjectSelect'); // Dropdown de seleção de matéria em anotacoes.html
    const currentNotesSubjectDisplay = document.getElementById('currentNotesSubject'); // Para exibir o nome da matéria nas anotações

    let tinyMCEEditorInstance = null; // Variável para armazenar a instância do TinyMCE

    // Dados dos flashcards (você pode carregar isso de um JSON ou API em um app mais complexo)
    let flashcardsData = [
        // Flashcards de Biologia (Exemplo inicial)
        { question: "O que é mitose?", answer: "A mitose é um processo de divisão celular em que uma célula-mãe se divide em duas células-filhas geneticamente idênticas." },
        { question: "Qual a função do cloroplasto?", answer: "O cloroplasto é a organela responsável pela fotossíntese nas células vegetais." },
        { question: "O que é DNA?", answer: "DNA (ácido desoxirribonucleico) é a molécula que contém as instruções genéticas usadas no desenvolvimento e funcionamento de todos os organismos vivos." },
        { question: "Diferença entre célula procariótica e eucariótica?", answer: "Células procarióticas não possuem núcleo definido nem organelas membranosas. Células eucarióticas possuem núcleo e organelas membranosas, além de serem maiores." },
        { question: "O que são enzimas?", answer: "Enzimas são proteínas que atuam como catalisadores biológicos, acelerando reações químicas no corpo sem serem consumidas." }
    ];

    let currentFlashcard = 0; // Índice do flashcard atual

    // Função para atualizar o conteúdo do flashcard na tela
    function updateFlashcardDisplay() {
        if (flashcardElement && flashcardsData.length > 0) {
            const front = flashcardElement.querySelector('.flashcard-front h3');
            const back = flashcardElement.querySelector('.flashcard-back p');

            front.textContent = flashcardsData[currentFlashcard].question;
            back.textContent = flashcardsData[currentFlashcard].answer;

            // Atualiza o contador de flashcards
            currentFlashcardIndexSpan.textContent = currentFlashcard + 1;
            totalFlashcardsSpan.textContent = flashcardsData.length;

            // Garante que o flashcard não esteja virado ao mudar para o próximo/anterior
            if (flashcardElement.classList.contains('flipped')) {
                flashcardElement.classList.remove('flipped');
            }
        } else if (flashcardElement) {
            // Se não houver flashcards, exibe uma mensagem
            flashcardElement.querySelector('.flashcard-front h3').textContent = "Nenhum flashcard disponível.";
            flashcardElement.querySelector('.flashcard-back p').textContent = "Gere novos flashcards ou adicione-os manualmente.";
            currentFlashcardIndexSpan.textContent = "0";
            totalFlashcardsSpan.textContent = "0";
            flashcardElement.classList.remove('flipped'); // Garante que não esteja virado
        }
    }

    // Função para gerar flashcards usando a API do Gemini
    async function generateFlashcards(topic) {
        if (!topic) {
            console.warn("Nenhum tópico fornecido para gerar flashcards.");
            return;
        }

        loadingIndicator.style.display = 'block'; // Mostra o spinner de carregamento
        generateFlashcardsButton.disabled = true; // Desabilita o botão

        let chatHistory = [];
        const prompt = `Gere 5 flashcards de pergunta e resposta sobre o tópico: "${topic}". Forneça a resposta em formato JSON como um array de objetos, onde cada objeto tem as chaves "question" e "answer". Certifique-se de que a resposta seja APENAS o JSON válido.`;
        
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        
        const payload = {
            contents: chatHistory,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            "question": { "type": "STRING" },
                            "answer": { "type": "STRING" }
                        },
                        "propertyOrdering": ["question", "answer"]
                    }
                }
            }
        };

        const apiKey = "AIzaSyDVU4bicBfIf1UV85vBS6mEu9WMVyhCF7U"; // <-- COLE SUA CHAVE DE API AQUI para rodar localmente!
        // No ambiente Canvas, você deixaria assim: const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro de rede ou API: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                const newFlashcards = JSON.parse(jsonText);

                if (Array.isArray(newFlashcards) && newFlashcards.every(fc => typeof fc.question === 'string' && typeof fc.answer === 'string')) {
                    flashcardsData = newFlashcards; // Substitui os flashcards existentes
                    currentFlashcard = 0; // Volta para o primeiro flashcard
                    updateFlashcardDisplay();
                    console.log('Novos flashcards gerados e carregados!', newFlashcards);
                } else {
                    console.error("Formato inesperado da resposta do LLM:", newFlashcards);
                    alert("Erro: O LLM não gerou os flashcards no formato esperado. Tente um tópico mais simples.");
                }
            } else {
                console.error("Resposta inválida da API do Gemini:", result);
                alert("Erro ao gerar flashcards: Resposta vazia ou inválida da API.");
            }
        } catch (error) {
            console.error("Erro ao chamar a API do Gemini:", error);
            alert(`Ocorreu um erro ao gerar os flashcards: ${error.message}. Verifique sua conexão ou tente novamente com um tópico mais simples.`);
        } finally {
            loadingIndicator.style.display = 'none'; // Esconde o spinner
            generateFlashcardsButton.disabled = false; // Habilita o botão novamente
        }
    }

    // Verifica se os elementos do flashcard existem antes de adicionar event listeners
    if (flashcardElement && flipButton && prevButton && nextButton) {
        updateFlashcardDisplay(); // Inicializa o primeiro flashcard

        flipButton.addEventListener('click', () => {
            flashcardElement.classList.toggle('flipped');
        });

        nextButton.addEventListener('click', () => {
            if (flashcardsData.length > 0) {
                currentFlashcard = (currentFlashcard + 1) % flashcardsData.length;
                updateFlashcardDisplay();
            }
        });

        prevButton.addEventListener('click', () => {
            if (flashcardsData.length > 0) {
                currentFlashcard = (currentFlashcard - 1 + flashcardsData.length) % flashcardsData.length;
                updateFlashcardDisplay();
            }
        });
    }

    // Adiciona o evento de clique ao botão de gerar flashcards
    if (generateFlashcardsButton && topicInput) {
        generateFlashcardsButton.addEventListener('click', () => {
            const topic = topicInput.value.trim();
            if (topic) {
                generateFlashcards(topic);
            } else {
                alert("Por favor, digite um tópico para gerar flashcards.");
            }
        });
    }

    // Lógica da logo clicável e perfil do usuário (em todas as páginas com a logo clicável)
    const clickableLogo = document.querySelector('.clickable-logo');
    const userProfileNav = document.querySelector('.user-profile-nav');
    const closeProfileButton = document.querySelector('.close-profile');
    
    // O perfil do usuário agora é estático.
    const userInfoClickableArea = clickableLogo; 

    if (userInfoClickableArea && userProfileNav) {
        userInfoClickableArea.addEventListener('click', () => {
            userProfileNav.style.display = userProfileNav.style.display === 'none' ? 'block' : 'none'; // 'block' para display padrão
        });
    }

    if (closeProfileButton && userProfileNav) {
        closeProfileButton.addEventListener('click', () => {
            userProfileNav.style.display = 'none';
        });
    }

    // --- FUNÇÕES DE ANOTAÇÕES COM LOCAL STORAGE E TINYMCE ---

    // Inicializa o TinyMCE se o elemento alvo estiver presente (ou seja, estamos em anotacoes.html)
    if (notesInputTarget) {
        tinymce.init({
            selector: '#tinymce-editor', // O ID do div que o TinyMCE vai transformar
            plugins: 'lists link image code autoresize fullscreen', // Plugins úteis para formatação
            toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | link code | fullscreen',
            min_height: 300, // Altura mínima do editor
            setup: function (editor) {
                editor.on('init', function () {
                    console.log('TinyMCE initialized.');
                    tinyMCEEditorInstance = editor; // Armazena a instância do editor

                    // Carrega as anotações assim que o editor estiver pronto e a matéria selecionada
                    if (subjectSelect) {
                        const initialSubject = subjectSelect.value;
                        if (currentNotesSubjectDisplay) {
                            currentNotesSubjectDisplay.textContent = subjectSelect.options[subjectSelect.selectedIndex].text;
                        }
                        loadNotesFromLocalStorage(initialSubject);

                        // Adiciona um listener para quando a seleção da matéria muda
                        subjectSelect.addEventListener('change', () => {
                            const selectedSubject = subjectSelect.value;
                            loadNotesFromLocalStorage(selectedSubject);
                            // Atualiza o título do notes area
                            if (currentNotesSubjectDisplay) {
                                currentNotesSubjectDisplay.textContent = subjectSelect.options[subjectSelect.selectedIndex].text;
                            }
                        });
                    }
                });
            }
        });
    }


    // Função para carregar anotações do Local Storage
    function loadNotesFromLocalStorage(subject) {
        // Verifica se o editor TinyMCE está pronto
        if (!tinyMCEEditorInstance || !notesStatus) {
            console.log("TinyMCE editor ou status de notas não prontos para carregar.");
            return;
        }

        const storageKey = `mrstuudos_notes_${subject}`;
        const savedNotes = localStorage.getItem(storageKey);

        if (savedNotes) {
            tinyMCEEditorInstance.setContent(savedNotes); // Define o conteúdo do editor
            notesStatus.textContent = `Anotações carregadas para ${subject}!`;
            notesStatus.style.color = "green";
        } else {
            tinyMCEEditorInstance.setContent(""); // Limpa o editor
            notesStatus.textContent = `Nenhuma anotação salva para ${subject} ainda.`;
            notesStatus.style.color = "orange";
        }
        // Limpa a mensagem de status após alguns segundos
        setTimeout(() => {
            notesStatus.textContent = "";
        }, 3000);
    }

    // Função para salvar anotações no Local Storage
    function saveNotesToLocalStorage(subject) {
        // Verifica se o editor TinyMCE está pronto
        if (!tinyMCEEditorInstance || !notesStatus || !saveNotesButton) {
            console.log("TinyMCE editor ou status de notas não prontos para salvar.");
            return;
        }

        const storageKey = `mrstuudos_notes_${subject}`;
        const notesContent = tinyMCEEditorInstance.getContent(); // Pega o conteúdo HTML do editor
        
        notesStatus.textContent = "Salvando...";
        notesStatus.style.color = "gray";
        saveNotesButton.disabled = true; // Desabilita o botão enquanto salva

        try {
            localStorage.setItem(storageKey, notesContent);
            notesStatus.textContent = "Anotações salvas com sucesso!";
            notesStatus.style.color = "green";
        } catch (e) {
            console.error("Erro ao salvar anotações no Local Storage:", e);
            notesStatus.textContent = `Erro ao salvar: ${e.message}`;
            notesStatus.style.color = "red";
        } finally {
            saveNotesButton.disabled = false; // Habilita o botão
            // Limpa a mensagem de status após alguns segundos
            setTimeout(() => {
                notesStatus.textContent = "";
            }, 3000);
        }
    }

    // Adiciona o evento de clique ao botão "Salvar Anotações"
    if (saveNotesButton && notesInputTarget && subjectSelect) { // Garante que estamos na página de anotações
        saveNotesButton.addEventListener('click', () => {
            const selectedSubject = subjectSelect.value;
            saveNotesToLocalStorage(selectedSubject);
        });
    }
});
