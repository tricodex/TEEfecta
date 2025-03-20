use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

fn handle(mut stream: TcpStream) {
    println!("Connection opened: {}", stream.peer_addr().unwrap());
    let mut buf = [0; 512];
    loop {
        match stream.read(&mut buf) {
            Ok(0) => {
                println!("Connection closed: {}", stream.peer_addr().unwrap());
                return;
            }
            Ok(n) => {
                if let Err(e) = stream.write_all(&buf[..n]) {
                    eprintln!("Failed to write to socket: {}", e);
                    return;
                }
            }
            Err(e) => {
                eprintln!("Failed to read from socket: {}", e);
                break;
            }
        }
    }
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:8080")?;
    println!("Server listening on 0.0.0.0:8080");

    listener
        .incoming()
        .try_for_each(|stream| -> Result<_, std::io::Error> {
            let stream = stream?;
            std::thread::spawn(move || {
                handle(stream);
            });
            Ok(())
        })
}
