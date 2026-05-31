#!/bin/bash

# 配置项
VERSION="10.5.5"
BINARY_NAME="wstunnel"
INSTALL_PATH="/usr/local/bin/${BINARY_NAME}"
SERVICE_PATH="/etc/systemd/system/${BINARY_NAME}.service"
TMP_DIR="/tmp/wstunnel_setup"

# 检查权限
[[ $EUID -ne 0 ]] && echo "错误: 请以 root 权限运行此脚本" && exit 1

install_wstunnel() {
    # 询问端口
    read -p "请输入 wstunnel 监听端口 (默认 8080): " LISTEN_PORT
    LISTEN_PORT=${LISTEN_PORT:-8080}
    
    echo "--- 正在下载版本 ${VERSION} ---"
    URL="https://github.com/erebe/wstunnel/releases/download/v${VERSION}/wstunnel_${VERSION}_linux_amd64.tar.gz"
    
    mkdir -p ${TMP_DIR}
    curl -L ${URL} -o ${TMP_DIR}/wstunnel.tar.gz
    
    echo "--- 正在安装到 ${INSTALL_PATH} ---"
    tar -zxvf ${TMP_DIR}/wstunnel.tar.gz -C ${TMP_DIR}
    mv ${TMP_DIR}/${BINARY_NAME} ${INSTALL_PATH}
    chmod +x ${INSTALL_PATH}
    
    echo "--- 正在创建 systemd 服务 ---"
    cat > ${SERVICE_PATH} << EOF
[Unit]
Description=Wstunnel Server
After=network.target

[Service]
ExecStart=${INSTALL_PATH} -s 0.0.0.0:${LISTEN_PORT} --restrictTo 127.0.0.1:22
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ${BINARY_NAME}
    systemctl restart ${BINARY_NAME}
    
    # 清理
    rm -rf ${TMP_DIR}
    
    echo "--------------------------------------------------"
    echo "安装成功!"
    echo "监听端口: ${LISTEN_PORT}"
    echo "服务状态: systemctl status ${BINARY_NAME}"
    echo "--------------------------------------------------"
}

remove_wstunnel() {
    echo "--- 正在停止并卸载服务 ---"
    systemctl stop ${BINARY_NAME}
    systemctl disable ${BINARY_NAME}
    rm -f ${SERVICE_PATH}
    rm -f ${INSTALL_PATH}
    systemctl daemon-reload
    echo "卸载完成。"
}

# 菜单逻辑
case "$1" in
    install)
        install_wstunnel
        ;;
    remove)
        remove_wstunnel
        ;;
    status)
        systemctl status ${BINARY_NAME} || echo "服务未运行或未安装。"
        ;;
    *)
        echo "用法: sudo $0 {install|remove|status}"
        exit 1
        ;;
esac