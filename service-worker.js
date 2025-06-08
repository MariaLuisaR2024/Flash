const CACHE_NAME = 'mrstuudos-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/materias.html',
    '/biologia.html',
    '/anotacoes.html',
    '/manifest.json',
    '/style.css',
    '/script.js',
    '/logo.png',
    '/ferrari.jpg',
    '/butterfly1.png',
    '/butterfly2.png',
    '/biologia_icon.png',
    '/matematica_icon.png',
    '/fisica_icon.png',
    '/fuvest.png',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdn.tiny.cloud/1/AIzaSyDVU4bicBfIf1UV85vBS6mEu9WMVyhCF7U/tinymce/6/tinymce.min.js', // Mantenha sua chave TinyMCE aqui!
    // Adicione outros arquivos que você quer que o PWA cacheie
];

// Evento de instalação: cacheia os arquivos estáticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento de fetch: serve arquivos do cache ou da rede
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna o arquivo do cache se encontrado
                if (response) {
                    return response;
                }
                // Se não estiver no cache, busca na rede
                return fetch(event.request).then(
                    function(response) {
                        // Verifica se a resposta é válida
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        // Clona a resposta para que ela possa ser consumida pela rede e pelo cache
                        var responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Deleta caches antigos
                    }
                })
            );
        })
    );
});