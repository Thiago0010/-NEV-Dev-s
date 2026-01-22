from fastapi import FastAPI, HTTPException
import requests
from bs4 import BeautifulSoup
import re
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

@app.get("/instagram/{username}")
def get_instagram_basic(username: str):
    url = f"https://www.instagram.com/{username}/"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    r = requests.get(url, headers=headers)

    if r.status_code != 200:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    soup = BeautifulSoup(r.text, "html.parser")

    # Meta tag que contém os números
    meta = soup.find("meta", property="og:description")
    if not meta:
        raise HTTPException(status_code=500, detail="Dados não disponíveis")

    content = meta["content"]
    # Ex: "1.234 Followers, 56 Following, 78 Posts"
    numbers = re.findall(r"([\d,.]+)", content)

    return {
        "username": username,
        "followers": numbers[0],
        "following": numbers[1],
        "posts": numbers[2]
    }



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em dev pode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}