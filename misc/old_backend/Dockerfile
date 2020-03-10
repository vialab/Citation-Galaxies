FROM python:3.7

RUN pip install numpy pandas psycopg2 flask flask-cors SQLAlchemy gensim

ENV FLASK_APP server.py
ENV DEPLOY_ENV PROD

WORKDIR /usr/src/app

COPY . /usr/src/app

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0"]
