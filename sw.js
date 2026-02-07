// sw.js
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    
event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(clientList) {
            // 開いているウィンドウ（タブ）を走査
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // ウィンドウがフォーカスされている（＝ユーザーが見ている）場合
                // かつ、現在開いているURLが通知対象のURLと同じドメインなどの場合
                if (client.focused) {
                    // 通知を表示せずに終了する（これで「開いている時は通知しない」が実現）
                    console.log("アプリが開かれているため通知を抑制しました。");
                    return; 
                }
            }

            // ここに来る＝フォーカスされているウィンドウがない（アプリを見ていない、または閉じている）
            const title = data.title || '新しいメッセージ';
            const options = {
                body: data.body || '内容がありません',
                icon: '/static/images/icon.png',
                badge: '/static/images/badge.png',
                data: {
                    url: data.url || '/'
                }
            };

            return self.registration.showNotification(title, options);
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(clientList) {
            // 既に開いているタブがあればフォーカス
            const url = event.notification.data.url;
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // なければ新しいタブで開く
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});