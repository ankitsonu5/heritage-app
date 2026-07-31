# dapp.heritageimshospital.com पर लाना

एक ही domain पर दोनों चीज़ें: `/` पर admin dashboard, और `/api`, `/uploads`,
`/socket.io` backend को proxy। दोनों एक ही origin पर होने से browser की हर request
same-origin है — CORS की समस्या पैदा ही नहीं होती। APK भी इसी domain को call करता है।

सारे command server (`/var/www/heritage-app`) पर चलेंगे।

---

## 1. DNS

Server का public IP:

```bash
curl -s -4 ifconfig.me; echo
```

Domain के DNS panel में एक record जोड़ें:

| Type | Name   | Value       |
| ---- | ------ | ----------- |
| A    | `dapp` | ऊपर वाला IP |

फैलने में 5–30 मिनट लगते हैं। जाँच:

```bash
dig +short dapp.heritageimshospital.com
```

जब तक यह IP न लौटाए, आगे का SSL step fail होगा — certbot domain को verify नहीं कर पाएगा।

## 2. Backend की production settings

```bash
cd /var/www/heritage-app/backend
nano .env
```

चार बदलाव ज़रूरी हैं:

```
PORT=5001                        # 5000 पर HMS-MONOREPO पहले से बैठा है
ALLOWED_ORIGINS=https://dapp.heritageimshospital.com
JWT_SECRET=<नया random>          # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# DEV_OTP वाली line पूरी हटा दें
```

`DEV_OTP` production में कभी नहीं। वह set हो तो हर OTP एक ही तय कोड होता है — कोई भी
किसी के भी नंबर से घुस जाएगा।

`DNS_SERVERS` की line भी हटा सकते हैं; वह laptop के टूटे DNS के लिए थी।

## 3. Backend को service बनाएँ

`npm run start` SSH बंद होते ही मर जाता है। इस server पर pm2 पहले से है (HMS-MONOREPO
उसी पर चलता है), इसलिए यही app भी उसी के हवाले:

```bash
cd /var/www/heritage-app/backend
NODE_ENV=production pm2 start src/server.js --name heritage-api --update-env
pm2 save
pm2 startup systemd        # जो command छापे उसे चलाएँ — boot पर auto-start
curl -s localhost:5001/api/health           # {"ok":true,...}
```

`NODE_ENV=production` छूटा तो backend हर OTP को API response में वापस भेजता है
(`src/app.js` का `issueOtp`) — testing के लिए बना रास्ता, production में खुला दरवाज़ा।

Logs: `pm2 logs heritage-api`

systemd पसंद हो तो `deploy/systemd/heritage-api.service` उसी काम का तैयार unit है —
पर दोनों एक साथ मत चलाइए, दूसरा `EADDRINUSE` देकर मर जाएगा।

## 4. Dashboard build करें

```bash
cd /var/www/heritage-app/admin-web
npm install
npm run build:web                            # → dist-web/
```

API का पता `admin-web/.env.production` से आता है और build के समय bundle में पक जाता
है। बदलने पर दोबारा build करना पड़ेगा — यह runtime पर नहीं पढ़ा जाता।

nginx को folder पढ़ने देना है:

```bash
sudo chmod o+x /var/www /var/www/heritage-app /var/www/heritage-app/admin-web
```

## 5. nginx + SSL

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo cp /var/www/heritage-app/deploy/nginx/dapp.heritageimshospital.com.conf \
        /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/dapp.heritageimshospital.com.conf \
           /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d dapp.heritageimshospital.com
```

certbot उसी file में 443 का block और 80 → 443 का redirect खुद जोड़ देता है, और
renewal के लिए timer भी लगा देता है।

Firewall खुला हो:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw deny 5001                           # backend सिर्फ़ nginx के ज़रिये मिले
```

Backend `0.0.0.0` पर सुनता है, यानी बिना इस rule के लोग सीधे `http://IP:5001` से API
छू सकते हैं — HTTPS को दरकिनार करके। 5000 को मत छेड़िए: वह इस server पर चल रहे दूसरे
project (HMS-MONOREPO) का है।

## 6. जाँच

```bash
curl -s https://dapp.heritageimshospital.com/api/health          # {"ok":true,...}
curl -sI https://dapp.heritageimshospital.com/ | head -1          # 200
```

Browser में `https://dapp.heritageimshospital.com` खोलें → login page दिखे, login
काम करे, और DevTools → Network → WS में `/socket.io/` connection `101` पर टिका रहे।
वह 101 न दिखे तो real-time बंद है (dashboard चुपचाप 20s की polling पर आ जाएगा) —
nginx के `/socket.io/` block के Upgrade headers देखें।

## 7. APK और .exe दोबारा बनाएँ

दोनों में पता build के समय पक जाता है, इसलिए पुराने builds अब भी Render वाले URL पर
जाएँगे:

- APK: `heritagediagnostics/src/config.ts` → `PRODUCTION_API_URL` (हो चुका) → release build
- .exe: `admin-web/electron/main.cjs` → `API_URL` (हो चुका) → `npm run dist`

## हर deploy के बाद

```bash
cd /var/www/heritage-app && git pull
cd backend && npm install && pm2 restart heritage-api
cd ../admin-web && npm install && npm run build:web
```

nginx को reload करने की ज़रूरत नहीं — वह `dist-web/` को हर request पर disk से पढ़ता है।

---

## जो ग़लत जा सकता है

**Atlas का IP whitelist.** Server का IP Atlas → Network Access में होना चाहिए, वरना
backend `MongooseServerSelectionError` देकर बंद हो जाएगा। VPS का IP स्थिर है, इसलिए
`0.0.0.0/0` की ज़रूरत नहीं — सिर्फ़ वही एक IP डालें।

**File upload पर 413.** nginx की default सीमा 1 MB है; config में
`client_max_body_size 12M` इसीलिए है (multer 8 MB तक लेता है)। सीमा बदलें तो दोनों
जगह बदलें।

**Atlas का password इस repo के इतिहास में जा चुका है.** Production में जाने से पहले
Atlas → Database Access से उसे rotate कर लें, और `.env` कभी commit न हो (gitignored है)।
