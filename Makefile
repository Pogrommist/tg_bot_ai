build:
	docker build -t tg_bot .

run:
	docker run -d -p 3000:3000 --name tg_bot --rm tg_bot
