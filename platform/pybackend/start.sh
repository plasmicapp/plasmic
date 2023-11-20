source .direnv/python-3.10/bin/activate

poetry run uvicorn pybackend.apiserver:app --reload
