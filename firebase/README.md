# Firebase setup (parent postcard lookup)

1. Create a Firebase project and enable **Firestore** + **Storage**.
2. Create a Web app and copy the config into [`../public/assets/firebase-config.js`](../public/assets/firebase-config.js).
3. Deploy rules from this folder:

```bash
cd firebase
npx firebase-tools login
npx firebase-tools use postcard-2af8a
npx firebase-tools deploy --only firestore:rules,storage
```

**Important:** Photos are stored in **Firebase Storage** (`postcard-images/...`), then the download URL is saved in the Firestore document.  
If Storage is not enabled, or storage rules are not deployed, saving a postcard with photos will fail.

## Teacher link

Share one link with parents:

`https://YOUR_DOMAIN/postcard-share-parents`

Parents enter the student’s ID to see only that student’s postcard.
