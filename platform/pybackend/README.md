# pybackend

## Setup

Have asdf-direnv installed, so that `.direnv/python*` exists when you cd here.

```bash
pip install poetry
poetry install
```

## Usage

Start with:

```
poetry run uvicorn pybackend.apiserver:app --reload
```

Hit routes like POST /api/v1/sqlalchemy.

## More info

Project generated with hypermodern python cookiecutter.
