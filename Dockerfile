FROM golang:1.23.1

WORKDIR /go/src/app

COPY . .

RUN go mod download

RUN CGO_ENABLED=0 go build -o /app ./main.go

FROM alpine:3.20.2

COPY /app /app

CMD ["/app"]
