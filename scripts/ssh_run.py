"""
scripts/ssh_run.py —— 通过 paramiko 在远程服务器执行命令（部署辅助）
用法: python ssh_run.py <host> <user> <password> "<command>"
"""
import sys
import paramiko


def main():
    if len(sys.argv) < 5:
        print('用法: ssh_run.py <host> <user> <password> "<command>"', file=sys.stderr)
        sys.exit(2)
    host, user, pwd, cmd = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=pwd, timeout=20)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        out = stdout.read().decode('utf-8', 'replace')
        err = stderr.read().decode('utf-8', 'replace')
        if out:
            print(out)
        if err:
            print('STDERR: ' + err, file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print('SSH 错误: ' + str(e), file=sys.stderr)
        sys.exit(1)
    finally:
        client.close()


if __name__ == '__main__':
    main()
