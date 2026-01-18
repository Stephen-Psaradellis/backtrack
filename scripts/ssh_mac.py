#!/usr/bin/env python3
import paramiko
import sys
import time

def run_ssh_command(host, username, password, command):
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

        stdin, stdout, stderr = client.exec_command(command, timeout=300)

        output = stdout.read().decode()
        errors = stderr.read().decode()

        if output:
            print("STDOUT:")
            print(output)
        if errors:
            print("STDERR:")
            print(errors)

        return output, errors
    except Exception as e:
        print(f"Error: {e}")
        return None, str(e)
    finally:
        client.close()

if __name__ == "__main__":
    host = "74.91.11.165"
    username = "user289978"
    password = "cnd77867fdh"

    command = sys.argv[1] if len(sys.argv) > 1 else "pwd && ls -la"

    run_ssh_command(host, username, password, command)
