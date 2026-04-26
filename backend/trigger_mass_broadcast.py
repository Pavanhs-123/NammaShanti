import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

docs = db.collection("incidents").limit(1).get()
if docs:
    doc = docs[0]
    print(f"Triggering mass broadcast for {doc.id}")
    doc.reference.update({"status": "approved", "mass_broadcast": True, "mass_broadcasted": False})
else:
    print("No incidents found")
