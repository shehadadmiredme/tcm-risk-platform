"""
scripts/ssh_upload.py —— 通过 SFTP 上传项目目录到远程服务器（部署辅助）
用法: python ssh_upload.py <host> <user> <password> <local_dir> <remote_dir>
"""
import os
import sys
import paramiko


def main():
    if len(sys.argv) < 6:
        print('用法: ssh_upload.py <host> <user> <password> <local_dir> <remote_dir>', file=sys.stderr)
        sys.exit(2)
    host, user, pwd = sys.argv[1], sys.argv[2], sys.argv[3]
    local_root = os.path.abspath(sys.argv[4])
    remote_root = sys.argv[5].rstrip('/')

    # 不随项目上传的内容
    EXCLUDES = {'.git', 'node_modules', '.vercel', '.env.local', 'ssh_run.py', 'ssh_upload.py'}

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=pwd, timeout=20)
        sftp = client.open_sftp()

        def ensure_dir(path):
            parts = path.split('/')
            cur = ''
            for p in parts:
                if not p:
                    continue
                cur = cur + '/' + p
                try:
                    sftp.stat(cur)
                except IOError:
                    sftp.mkdir(cur)

        ensure_dir(remote_root)
        count = 0
        for root, dirs, files in os.walk(local_root):
            dirs[:] = [d for d in dirs if d not in EXCLUDES]
            rel = os.path.relpath(root, local_root)
            rdir = remote_root if rel == '.' else remote_root + '/' + rel.replace('\\', '/')
            ensure_dir(rdir)
            for f in files:
                if f in EXCLUDES:
                    continue
                lf = os.path.join(root, f)
                rf = rdir + '/' + f
                try:
                    sftp.put(lf, rf)
                except Exception as e:
                    print('失败于: %s -> %s (%s)' % (lf, rf, e), file=sys.stderr)
                    raise
                count += 1
        print('上传完成，共 %d 个文件' % count)
        sftp.close()
    except Exception as e:
        print('上传错误: ' + str(e), file=sys.stderr)
        sys.exit(1)
    finally:
        client.close()


if __name__ == '__main__':
    main()
