#!/usr/bin/env python3
import paramiko
import sys
import time
import threading
import select

def run_interactive_ssh(host, username, password, commands, timeout=120):
    """Run commands in an interactive SSH session"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"Connecting to {host}...")
        client.connect(
            hostname=host,
            username=username,
            password=password,
            look_for_keys=False,
            allow_agent=False,
            timeout=30
        )
        print("Connected!")

        # Get an interactive shell
        channel = client.invoke_shell()
        channel.settimeout(timeout)

        # Wait for shell to be ready
        time.sleep(1)

        # Clear initial output
        while channel.recv_ready():
            channel.recv(4096)

        # Run commands
        for cmd in commands:
            print(f"\n>>> Running: {cmd}")
            channel.send(cmd + "\n")
            time.sleep(2)  # Give command time to execute

            # Collect output
            output = ""
            start_time = time.time()
            while time.time() - start_time < 30:  # 30 seconds per command
                if channel.recv_ready():
                    data = channel.recv(4096).decode('utf-8', errors='ignore')
                    output += data
                    print(data, end='', flush=True)
                    start_time = time.time()  # Reset timer if we got data
                else:
                    time.sleep(0.1)

        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        client.close()

if __name__ == "__main__":
    host = "74.91.11.165"
    username = "user289978"
    password = "cnd77867fdh"

    # Load nvm and run expo
    commands = [
        'export NVM_DIR="/Users/user289978/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
        'cd ~/love-ledger && npx expo start --ios --no-dev --minify 2>&1 &',
        'sleep 10 && echo "Metro started, checking status..."',
        'curl -s http://localhost:8081/status || echo "Metro not responding yet"'
    ]

    if len(sys.argv) > 1:
        commands = sys.argv[1:]

    run_interactive_ssh(host, username, password, commands)
