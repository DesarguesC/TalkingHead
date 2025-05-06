FROM continuumio/miniconda3

# 拷贝项目代码
COPY . /TalkingHead
WORKDIR /TalkingHead

# 安装依赖环境
COPY tianyigeNew.yml .
RUN conda env create -f tianyigeNew.yml
# 激活环境（通过 shell 入口）
SHELL ["conda", "run", "-n", "tianyigeNew", "/bin/bash", "-c"]

# 启动命令（替换为你的主脚本）
CMD ["python", "server.py"]

