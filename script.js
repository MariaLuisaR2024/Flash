document.addEventListener('DOMContentLoaded', () => {
    // Variável para armazenar o evento beforeinstallprompt para PWA
    let deferredPrompt;

    // Listener para o evento beforeinstallprompt (para PWA)
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
                const subject = card.dataset.subject; // Pega o valor do atributo data-subject (ex: "biologia", "questoes")
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

    // Elementos para a funcionalidade de geração de flashcards (em biologia.html)
    const topicInputFlashcard = document.getElementById('topicInput'); // Renomeado para evitar conflito
    const generateFlashcardsButton = document.getElementById('generateFlashcardsButton');
    const loadingIndicatorFlashcard = document.getElementById('loadingIndicator'); // Renomeado para evitar conflito

    // Elementos para a funcionalidade de Anotações/Bloco de Notas (TinyMCE)
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
    let currentFlashcard = 0;

    // Função para atualizar o conteúdo do flashcard na tela
    function updateFlashcardDisplay() {
        if (flashcardElement && flashcardsData.length > 0) {
            const front = flashcardElement.querySelector('.flashcard-front h3');
            const back = flashcardElement.querySelector('.flashcard-back p');

            front.textContent = flashcardsData[currentFlashcard].question;
            back.textContent = flashcardsData[currentFlashcard].answer;

            currentFlashcardIndexSpan.textContent = currentFlashcard + 1;
            totalFlashcardsSpan.textContent = flashcardsData.length;

            if (flashcardElement.classList.contains('flipped')) {
                flashcardElement.classList.remove('flipped');
            }
        } else if (flashcardElement) {
            flashcardElement.querySelector('.flashcard-front h3').textContent = "Nenhum flashcard disponível.";
            flashcardElement.querySelector('.flashcard-back p').textContent = "Gere novos flashcards ou adicione-os manualmente.";
            currentFlashcardIndexSpan.textContent = "0";
            totalFlashcardsSpan.textContent = "0";
            flashcardElement.classList.remove('flipped');
        }
    }

    // Função para gerar flashcards (biologia.html)
    async function generateFlashcards(topic) {
        if (!topic) {
            console.warn("Nenhum tópico fornecido para gerar flashcards.");
            return;
        }

        loadingIndicatorFlashcard.style.display = 'block';
        generateFlashcardsButton.disabled = true;

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

        const apiKey = "AIzaSyDVU4bicBfIf1UV85vBS6mEu9WMVyhCF7U"; // <-- COLOQUE SUA CHAVE DE API AQUI!
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
                    flashcardsData = newFlashcards;
                    currentFlashcard = 0;
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
            loadingIndicatorFlashcard.style.display = 'none';
            generateFlashcardsButton.disabled = false;
        }
    }

    if (flashcardElement && flipButton && prevButton && nextButton) {
        updateFlashcardDisplay();
        flipButton.addEventListener('click', () => { flashcardElement.classList.toggle('flipped'); });
        nextButton.addEventListener('click', () => { if (flashcardsData.length > 0) { currentFlashcard = (currentFlashcard + 1) % flashcardsData.length; updateFlashcardDisplay(); } });
        prevButton.addEventListener('click', () => { if (flashcardsData.length > 0) { currentFlashcard = (currentFlashcard - 1 + flashcardsData.length) % flashcardsData.length; updateFlashcardDisplay(); } });
    }
    if (generateFlashcardsButton && topicInputFlashcard) {
        generateFlashcardsButton.addEventListener('click', () => {
            const topic = topicInputFlashcard.value.trim();
            if (topic) { generateFlashcards(topic); } else { alert("Por favor, digite um tópico para gerar flashcards."); }
        });
    }


    // --- LÓGICA DE QUESTÕES DE VESTIBULAR (questoes.html) ---
    const questionContainer = document.querySelector('.question-container');
    const questionTextElement = document.getElementById('questionText');
    const alternativesListElement = document.getElementById('alternativesList');
    const feedbackArea = document.querySelector('.feedback-area');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const explanationBox = document.getElementById('explanationBox');
    const explanationText = document.getElementById('explanationText');
    const showAnswerButton = document.getElementById('showAnswerButton');
    const nextQuestionButton = document.getElementById('nextQuestionButton');
    const currentQuestionIndexDisplay = document.getElementById('currentQuestionIndexDisplay');
    const totalQuestionsDisplay = document.getElementById('totalQuestionsDisplay');
    const questionTopicInput = document.getElementById('questionTopicInput');
    const generateNewQuestionsButton = document.getElementById('generateNewQuestionsButton');
    const questionLoadingIndicator = document.getElementById('questionLoadingIndicator');
    const correctCountDisplay = document.getElementById('correctCount');
    const totalAttemptedDisplay = document.getElementById('totalAttempted');
    const noQuestionsMessage = document.getElementById('noQuestionsMessage');

    let questionsData = []; // Armazenará as questões geradas
    let currentQuestionIndex = 0;
    let correctAnswersCount = 0;
    let totalAttemptedQuestions = 0;
    let currentQuestionAnswered = false; // Flag para controlar se a questão atual já foi respondida

    // Função para embaralhar um array (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Função para exibir a questão atual
    function displayQuestion() {
        if (!questionContainer || questionsData.length === 0) {
            questionContainer.style.display = 'none';
            noQuestionsMessage.style.display = 'block';
            noQuestionsMessage.textContent = "Clique em 'Gerar Novas Questões' para começar!";
            return;
        }

        questionContainer.style.display = 'block';
        noQuestionsMessage.style.display = 'none';

        const currentQuestion = questionsData[currentQuestionIndex];
        questionTextElement.innerHTML = currentQuestion.question; // Usar innerHTML para tags HTML

        alternativesListElement.innerHTML = ''; // Limpa alternativas anteriores
        feedbackArea.style.display = 'none'; // Esconde feedback
        explanationBox.style.display = 'none'; // Esconde explicação

        // Cria uma cópia das alternativas e embaralha
        const shuffledAlternatives = shuffleArray([...currentQuestion.alternatives]);
        
        shuffledAlternatives.forEach((altText, index) => {
            const button = document.createElement('button');
            const letter = String.fromCharCode(65 + index); // A, B, C, D, E
            button.className = 'alternative-button';
            button.dataset.letter = letter; // Armazena a letra (A, B, C...)
            button.dataset.originalText = altText; // Armazena o texto original da alternativa
            button.innerHTML = `${letter}. ${altText}`;
            
            // Adiciona o evento de clique para verificar a resposta
            button.addEventListener('click', () => checkAnswer(button, currentQuestion.correctAnswerLetter, currentQuestion.explanation));
            alternativesListElement.appendChild(button);
        });

        currentQuestionIndexDisplay.textContent = currentQuestionIndex + 1;
        totalQuestionsDisplay.textContent = questionsData.length;
        
        currentQuestionAnswered = false; // Reseta flag para a nova questão
        showAnswerButton.style.display = 'block'; // Mostra o botão "Mostrar Resposta"
        enableAlternatives(); // Habilita os botões de alternativa
    }

    // Função para verificar a resposta
    function checkAnswer(chosenButton, correctAnswerLetter, explanation) {
        if (currentQuestionAnswered) return; // Impede múltiplos cliques

        currentQuestionAnswered = true; // Marca a questão como respondida
        totalAttemptedQuestions++; // Incrementa o contador de questões tentadas

        const allAlternativeButtons = alternativesListElement.querySelectorAll('.alternative-button');
        let isCorrect = false;

        allAlternativeButtons.forEach(button => {
            // Se o botão clicado for a alternativa correta (pela letra)
            if (button.dataset.letter === correctAnswerLetter) {
                button.classList.add('correct'); // Marca a correta com verde
            }

            if (button === chosenButton) { // Se for o botão que o usuário clicou
                button.classList.add('selected'); // Marca a escolha do usuário

                if (chosenButton.dataset.letter === correctAnswerLetter) {
                    isCorrect = true;
                    correctAnswersCount++;
                    feedbackMessage.textContent = "Certo!";
                    feedbackMessage.className = 'feedback-message correct';
                } else {
                    feedbackMessage.textContent = "Errado!";
                    feedbackMessage.className = 'feedback-message incorrect';
                }
            }
            button.disabled = true; // Desabilita todos os botões após a resposta
        });

        updatePerformanceCounter();
        displayFeedback(explanation);
        showAnswerButton.style.display = 'none'; // Esconde o botão "Mostrar Resposta" após responder
    }

    // Função para mostrar a resposta sem responder
    function showAnswer() {
        if (currentQuestionAnswered) return; // Se já respondeu, não faz nada
        currentQuestionAnswered = true; // Marca como respondida para desabilitar alternativas

        const allAlternativeButtons = alternativesListElement.querySelectorAll('.alternative-button');
        const currentQuestion = questionsData[currentQuestionIndex];

        allAlternativeButtons.forEach(button => {
            if (button.dataset.letter === currentQuestion.correctAnswerLetter) {
                button.classList.add('correct'); // Marca a correta
            }
            button.disabled = true; // Desabilita todas
        });
        feedbackMessage.textContent = "Resposta revelada!";
        feedbackMessage.className = 'feedback-message info';
        displayFeedback(currentQuestion.explanation);
        showAnswerButton.style.display = 'none'; // Esconde o botão "Mostrar Resposta"
    }

    // Habilita as alternativas
    function enableAlternatives() {
        const allAlternativeButtons = alternativesListElement.querySelectorAll('.alternative-button');
        allAlternativeButtons.forEach(button => {
            button.disabled = false;
            button.classList.remove('selected', 'correct', 'incorrect');
        });
    }

    // Exibe a área de feedback
    function displayFeedback(explanation) {
        feedbackArea.style.display = 'block';
        explanationText.innerHTML = explanation;
        explanationBox.style.display = 'block';
    }

    // Atualiza o contador de desempenho
    function updatePerformanceCounter() {
        correctCountDisplay.textContent = correctAnswersCount;
        totalAttemptedDisplay.textContent = totalAttemptedQuestions;
    }

    // Função para avançar para a próxima questão
    function nextQuestion() {
        if (questionsData.length === 0) return;

        currentQuestionIndex++;
        if (currentQuestionIndex >= questionsData.length) {
            currentQuestionIndex = 0; // Reinicia se chegar ao fim
            alert("Fim das questões! Reiniciando a sessão. Se desejar novas questões, gere mais.");
            correctAnswersCount = 0; // Reinicia o contador de acertos
            totalAttemptedQuestions = 0; // Reinicia o contador de tentativas
        }
        displayQuestion();
        updatePerformanceCounter(); // Atualiza o display do contador
    }

    // Função para gerar questões de múltipla escolha usando a API do Gemini
    async function generateMultipleChoiceQuestions(topic) {
        questionLoadingIndicator.style.display = 'block';
        generateNewQuestionsButton.disabled = true;
        questionContainer.style.display = 'none'; // Esconde container de questões
        noQuestionsMessage.style.display = 'block';
        noQuestionsMessage.textContent = "Gerando novas questões, por favor aguarde...";


        let chatHistory = [];
        // PROMPT ATUALIZADO: Pedindo a letra da resposta correta e enfatizando coerência
        const prompt = `Gere 5 questões de múltipla escolha de vestibular (formato ENEM, Fuvest, Unicamp, Unesp) sobre o tópico "${topic || 'conhecimentos gerais'}", cada uma com:
        - um enunciado claro
        - 5 alternativas (A, B, C, D, E)
        - apenas uma correta
        - o atributo 'correctAnswerLetter' com a letra correta (A, B, C, D ou E)
        - uma explicação detalhada e CONCISA da resposta correta que seja totalmente COERENTE com a alternativa correta.
        Forneça a resposta em formato JSON como um array de objetos, onde cada objeto tem as chaves:
        "question" (string),
        "alternatives" (array de strings com 5 elementos),
        "correctAnswerLetter" (string, a LETRA da alternativa correta, ex: "A", "B", "C", "D" ou "E"),
        "explanation" (string).
        Certifique-se de que a resposta seja APENAS o JSON válido.`;
        
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
                            "alternatives": { "type": "ARRAY", "items": { "type": "STRING" } },
                            "correctAnswerLetter": { "type": "STRING" }, // Mudou para Letter
                            "explanation": { "type": "STRING" }
                        },
                        "propertyOrdering": ["question", "alternatives", "correctAnswerLetter", "explanation"]
                    }
                }
            }
        };

        const apiKey = "AIzaSyDVU4bicBfIf1UV85vBS6mEu9WMVyhCF7U"; // <-- COLOQUE SUA CHAVE DE API AQUI!
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
                const newQuestions = JSON.parse(jsonText);

                // Validação mais rigorosa para o formato da questão
                if (Array.isArray(newQuestions) && 
                    newQuestions.every(q => 
                        typeof q.question === 'string' && 
                        Array.isArray(q.alternatives) && q.alternatives.length === 5 && 
                        typeof q.correctAnswerLetter === 'string' && q.correctAnswerLetter.length === 1 && 'ABCDE'.includes(q.correctAnswerLetter.toUpperCase()) &&
                        typeof q.explanation === 'string'
                    )
                ) {
                    questionsData = newQuestions;
                    currentQuestionIndex = 0;
                    correctAnswersCount = 0;
                    totalAttemptedQuestions = 0;
                    updatePerformanceCounter();
                    displayQuestion();
                    console.log('Novas questões geradas e carregadas!', newQuestions);
                } else {
                    console.error("Formato inesperado da resposta do LLM:", newQuestions);
                    alert("Erro: O LLM não gerou as questões no formato esperado. Tente um tópico mais simples ou geral e verifique o console para detalhes.");
                    questionContainer.style.display = 'none';
                    noQuestionsMessage.textContent = "Erro ao carregar questões. Formato inválido. Tente novamente com um tópico diferente.";
                }
            } else {
                console.error("Resposta inválida da API do Gemini:", result);
                alert("Erro ao gerar questões: Resposta vazia ou inválida da API.");
                questionContainer.style.display = 'none';
                noQuestionsMessage.textContent = "Erro ao gerar questões. Resposta vazia ou inválida.";
            }
        } catch (error) {
            console.error("Erro ao chamar a API do Gemini:", error);
            alert(`Ocorreu um erro ao gerar as questões: ${error.message}. Verifique sua conexão ou tente novamente.`);
            questionContainer.style.display = 'none';
            noQuestionsMessage.textContent = "Erro ao gerar questões. Verifique sua conexão e tente novamente.";
        } finally {
            questionLoadingIndicator.style.display = 'none';
            generateNewQuestionsButton.disabled = false;
        }
    }


    // --- LISTENERS GERAIS (para todas as páginas) ---
    // Lógica da logo clicável e perfil do usuário
    const clickableLogo = document.querySelector('.clickable-logo');
    const userProfileNav = document.querySelector('.user-profile-nav');
    const closeProfileButton = document.querySelector('.close-profile');
    
    const userInfoClickableArea = clickableLogo; 

    if (userInfoClickableArea && userProfileNav) {
        userInfoClickableArea.addEventListener('click', () => {
            userProfileNav.style.display = userProfileNav.style.display === 'none' ? 'block' : 'none'; 
        });
    }

    if (closeProfileButton && userProfileNav) {
        closeProfileButton.addEventListener('click', () => {
            userProfileNav.style.display = 'none';
        });
    }


    // --- LÓGICA DE ANOTAÇÕES COM LOCAL STORAGE E TINYMCE (anotacoes.html) ---
    // Inicializa o TinyMCE se o elemento alvo estiver presente (ou seja, estamos em anotacoes.html)
    if (notesInputTarget) {
        tinymce.init({
            selector: '#tinymce-editor', 
            plugins: 'lists link image code autoresize fullscreen',
            toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignjustify | bullist numlist outdent indent | removeformat | link code | fullscreen',
            min_height: 300,
            setup: function (editor) {
                editor.on('init', function () {
                    console.log('TinyMCE initialized.');
                    tinyMCEEditorInstance = editor;

                    if (subjectSelect) {
                        const initialSubject = subjectSelect.value;
                        if (currentNotesSubjectDisplay) {
                            currentNotesSubjectDisplay.textContent = subjectSelect.options[subjectSelect.selectedIndex].text;
                        }
                        loadNotesFromLocalStorage(initialSubject);

                        subjectSelect.addEventListener('change', () => {
                            const selectedSubject = subjectSelect.value;
                            loadNotesFromLocalStorage(selectedSubject);
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
        if (!tinyMCEEditorInstance || !notesStatus) {
            console.log("TinyMCE editor ou status de notas não prontos para carregar.");
            return;
        }
        const storageKey = `mrstuudos_notes_${subject}`;
        const savedNotes = localStorage.getItem(storageKey);
        if (savedNotes) {
            tinyMCEEditorInstance.setContent(savedNotes);
            notesStatus.textContent = `Anotações carregadas para ${subject}!`;
            notesStatus.style.color = "green";
        } else {
            tinyMCEEditorInstance.setContent("");
            notesStatus.textContent = `Nenhuma anotação salva para ${subject} ainda.`;
            notesStatus.style.color = "orange";
        }
        setTimeout(() => { notesStatus.textContent = ""; }, 3000);
    }

    // Função para salvar anotações no Local Storage
    function saveNotesToLocalStorage(subject) {
        if (!tinyMCEEditorInstance || !notesStatus || !saveNotesButton) {
            console.log("TinyMCE editor ou status de notas não prontos para salvar.");
            return;
        }
        const storageKey = `mrstuudos_notes_${subject}`;
        const notesContent = tinyMCEEditorInstance.getContent();
        
        notesStatus.textContent = "Salvando...";
        notesStatus.style.color = "gray";
        saveNotesButton.disabled = true;

        try {
            localStorage.setItem(storageKey, notesContent);
            notesStatus.textContent = "Anotações salvas com sucesso!";
            notesStatus.style.color = "green";
        } catch (e) {
            console.error("Erro ao salvar anotações no Local Storage:", e);
            notesStatus.textContent = `Erro ao salvar: ${e.message}`;
            notesStatus.style.color = "red";
        } finally {
            saveNotesButton.disabled = false;
            setTimeout(() => { notesStatus.textContent = ""; }, 3000);
        }
    }

    // Adiciona o evento de clique ao botão "Salvar Anotações"
    if (saveNotesButton && notesInputTarget && subjectSelect) {
        saveNotesButton.addEventListener('click', () => {
            const selectedSubject = subjectSelect.value;
            saveNotesToLocalStorage(selectedSubject);
        });
    }


    // --- LISTENERS DA PÁGINA DE QUESTÕES (questoes.html) ---
    // Garante que os listeners só sejam adicionados se os elementos existirem
    if (questionContainer && generateNewQuestionsButton) {
        // Listener para o botão de gerar novas questões
        generateNewQuestionsButton.addEventListener('click', () => {
            const topic = questionTopicInput.value.trim();
            generateMultipleChoiceQuestions(topic);
        });

        // Listener para o botão "Mostrar Resposta"
        showAnswerButton.addEventListener('click', showAnswer);

        // Listener para o botão "Próxima Questão"
        nextQuestionButton.addEventListener('click', nextQuestion);
    }

    // Exibe a mensagem inicial se não houver questões
    if (questionContainer && questionsData.length === 0) {
        questionContainer.style.display = 'none';
        noQuestionsMessage.style.display = 'block';
        noQuestionsMessage.textContent = "Clique em 'Gerar Novas Questões' para começar!";
    }
});