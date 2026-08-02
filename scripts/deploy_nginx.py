"""
scripts/deploy_nginx.py —— 配置 Nginx 反向代理（80 端口 → Express 3000）
用法: python deploy_nginx.py <host> <user> <password>
"""
import sys
import paramiko

CONFIG = """server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""


def main():
    if len(sys.argv) < 4:
        print('用法: deploy_nginx.py <host> <user> <password>', file=sys.stderr)
        sys.exit(2)
    host, user, pwd = sys.argv[1], sys.argv[2], sys.argv[3]

    cmds = [
        # 写入站点配置（单引号 heredoc，避免 $host 被 shell 展开）
        "cat > /etc/nginx/sites-available/tcm-risk-platform << 'NGINXEOF'\n" + CONFIG + "NGINXEOF",
        'rm -f /etc/nginx/sites-enabled/default',
        'ln -sf /etc/nginx/sites-available/tcm-risk-platform /etc/nginx/sites-enabled/tcm-risk-platform',
        'nginx -t',
        'systemctl reload nginx',
    ]

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=pwd, timeout=20)
        for c in cmds:
            stdin, stdout, stderr = client.exec_command(c, timeout=30)
            out = stdout.read().decode('utf-8', 'replace')
            err = stderr.read().decode('utf-8', 'replace')
            if out:
                print(out.rstrip())
            if err:
                print('STDERR: ' + err.rstrip())
        print('NGINX 配置完成')
    except Exception as e:
        print('配置错误: ' + str(e), file=sys.stderr)
        sys.exit(1)
    finally:
        client.close()


if __name__ == '__main__':
    main()
