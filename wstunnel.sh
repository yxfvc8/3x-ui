#!/bin/bash

# 配置项
WSTUNNEL_VERSION="10.5.5" # 请根据需要更新版本
INSTALL_DIR="/usr/local/bin"
SERVICE_NAME="wstunnel"
LISTEN_ADDR="0.0.0.0:8080" # 服务端监听端口
TARGET_ADDR="127.0.0.1:22"   # 转发给本地 SSH

# 检查 root
[[ $EUID -ne 0 ]] && echo "请以 root 权限运行" && exit 1

echo "正在下载 wstunnel v${WSTUNNEL_VERSION}..."
curl -L https://github.com/erebe/wstunnel/releases/download/v${WSTUNNEL_VERSION}/wstunnel_linux_x64 -o ${INSTALL_DIR}/wstunnel
chmod +x ${INSTALL_DIR}/wstunnel

# 创建 systemd 服务文件
echo "正在创建 systemd 服务..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Wstunnel Server
After=network.target

[Service]
ExecStart=${INSTALL_DIR}/wstunnel -s ${LISTEN_ADDR} --restrictTo ${TARGET_ADDR}
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
echo "正在启动服务..."
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

echo -e "\n--------------------------------------------------"
echo "wstunnel 已安装并启动！"
echo "监听地址: ${LISTEN_ADDR}"
echo "转发目标: ${TARGET_ADDR}"
echo "状态检查: systemctl status ${SERVICE_NAME}"
echo "--------------------------------------------------"