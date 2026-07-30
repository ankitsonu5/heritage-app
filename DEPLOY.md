# Backend को Render पर deploy करना

Backend एक public URL पर होना ज़रूरी है, तभी फ़ोन में लगी APK उससे बात कर पाएगी।
अभी वह आपके computer पर चल रहा है — फ़ोन उसे सिर्फ़ उसी Wi-Fi पर देख सकता है।

---

## 1. Atlas में Render को अंदर आने दें (सबसे ज़रूरी क़दम)

Render का IP बदलता रहता है, इसलिए Atlas उसे तब तक block करेगा जब तक आप इजाज़त न दें।

MongoDB Atlas → **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow from anywhere)

> यह database को दुनिया के लिए नहीं खोलता — username/password अब भी चाहिए। लेकिन
> इसका मतलब है कि **आपका password ही अकेला ताला है**। इसलिए अगला क़दम ज़रूरी है।

## 2. Atlas का password बदलें

आपका मौजूदा password इस chat में आ चुका है। Atlas → **Database Access** → user
`sakshigupta9029_db_user` → **Edit** → **Edit Password** → नया password → connection
string में उसे लगा लें।

## 3. Render पर deploy

1. यह repo GitHub पर push करें (private रखें)।
2. Render → **New** → **Blueprint** → repo चुनें। `render.yaml` अपने आप पढ़ लिया जाएगा।
3. Render तीन चीज़ें पूछेगा:

   | Variable | क्या डालें |
   |---|---|
   | `MONGODB_URI` | `mongodb+srv://USER:NEW_PASSWORD@cluster0.9hwcmgd.mongodb.net/heritage_diagnostics?retryWrites=true&w=majority` |
   | `JWT_SECRET` | 32+ random अक्षर। **लोकल वाला मत डालें।** बनाने के लिए: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `ALLOWED_ORIGINS` | admin dashboard का पता (अभी `*` चलेगा) |

4. **Create** दबाएँ। 2–3 मिनट में URL मिलेगा, जैसे
   `https://heritage-diagnostics-api.onrender.com`

5. जाँच लें:
   ```
   https://heritage-diagnostics-api.onrender.com/api/health
   ```
   `{"ok":true,...}` आना चाहिए।

## 4. Demo data डालें (एक बार)

Render → आपकी service → **Shell** →

```bash
npm run seed
```

## 5. URL मुझे बता दें

App और admin `.exe` दोनों में वही URL डालना है:

- App: `heritagediagnostics/src/config.ts` → `PRODUCTION_API_URL`
- Admin: `admin-web/src/config.ts` → `API_BASE_URL`

---

## जो ग़लत जा सकता है

**`DEV_OTP` production में कभी मत रखें.** `render.yaml` में जानबूझकर नहीं है। अगर वह
set हो, तो हर OTP एक ही तय कोड होता है — कोई भी किसी के भी नंबर से घुस जाएगा।

**Free plan 15 मिनट बेकार रहने पर सो जाता है।** उसके बाद पहली request में ~30 सेकंड
लगते हैं। Testing के लिए ठीक है; असली मरीज़ों के लिए paid plan लें।

**Uploads के लिए disk ज़रूरी है.** `render.yaml` में लगा दी है। उसके बिना Render हर
deploy पर files मिटा देता है — database में report का पता रह जाता, पर file ग़ायब।

**Database का नाम URI में ज़रूर हो** (`/heritage_diagnostics`)। वरना Mongo चुपचाप
`test` नाम के database में लिखता रहेगा।
