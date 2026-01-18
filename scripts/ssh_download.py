#!/usr/bin/env python3
import paramiko
import sys

def download_file(host, username, password, remote_path, local_path):
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

        sftp = client.open_sftp()
        print(f"Downloading {remote_path} to {local_path}...")
        sftp.get(remote_path, local_path)
        print("Download complete!")
        sftp.close()
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

    if len(sys.argv) >= 3:
        remote_path = sys.argv[1]
        local_path = sys.argv[2]
    else:
        remote_path = "/tmp/sim_screenshot3.png"
        local_path = "C:/Users/snpsa/love-ledger/scripts/sim_screenshot3.png"

    download_file(host, username, password, remote_path, local_path)
