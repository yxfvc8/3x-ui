package controller

import (
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/gorilla/websocket"
	"github.com/mhsanaei/3x-ui/v3/logger"
	"github.com/mhsanaei/3x-ui/v3/web/service"
	"github.com/mhsanaei/3x-ui/v3/web/session"

	"github.com/gin-gonic/gin"
)

// SSHController handles WebSocket connections for SSH terminal
type SSHController struct {
	BaseController
	service *service.SSHService
}

// NewSSHController creates a new SSH controller
func NewSSHController(svc *service.SSHService) *SSHController {
	return &SSHController{service: svc}
}

// HandleSSH handles the WebSocket upgrade for SSH connections
func (s *SSHController) HandleSSH(c *gin.Context) {
	if !session.IsLogin(c) {
		logger.Warningf("Unauthorized SSH connection attempt from %s", getRemoteIp(c))
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	var upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// 在生产环境，请务必校验 r.Header.Get("Origin")
			return true
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("Failed to upgrade SSH WebSocket connection:", err)
		return
	}
	s.service.HandleConnection(conn, getRemoteIp(c))
}
func (s *SSHController) HandleUpload(c *gin.Context) {

	currentPath := c.PostForm("path")
	if currentPath == "" {
		currentPath = "./" // 如果前端没传，给个默认值
	}

	// 1. 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "上传失败: " + err.Error()})
		return
	}

	// 2. 简单的文件名防篡改 (只取文件名，防止路径穿越攻击)
	filename := filepath.Base(file.Filename)

	// 3. 保存文件 (这里保存在当前目录下，你可以根据需要修改路径)
	dst := filepath.Join(currentPath, filename)

	// Gin 的 SaveUploadedFile 自动处理了流式拷贝，不需要手动 io.Copy
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("文件 %s 上传成功", filename)})
}
