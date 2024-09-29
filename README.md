## 关于本项目

本项目是一款基于QT和MySQL开发的数据库查询软件, 包含了作者在开发和日常学习当中可能会用到的各种技术栈知识点 
在搜索框中输入, 查询结果会在下方的控件当中显示 

## 联系作者

如果在使用过程中遇到任何问题, 欢迎联系开发者`chenphxx`进行反馈 

```
E-Main: john201950@outlook.com
VX: XieG0110
```

## 说明

从`V2024.9.27`版本开始, 程序数据库由`MySQL`改为`SQLite`, MySQL版本的程序迁移至分支`mysql`并且不再提供更新和维护 

## V2024.9.29

1. 改进了将数据库保存至默认位置的方式 
2. 为`另存为`界面添加了清空输入框按钮 

## V2024.9.27

1. 将程序使用的数据库从`MySQL`更改到了`SQLite` 

2. 新的数据库将存储在目录`sources`下的`database`文件夹中 

3. 添加了表`Embed` `QT` `SQLite` `Docker` 

4. `Language`改为`Tech-Stack` 

5. 修改了项目结构, 删除了一些不需要的测试文件 

6. 新增了切换数据库位置的功能 

7. 新增了根据`number_index`查找数据的功能, 方便进行数据的修改 

8. 为`另存为`界面新增了根据`number_index`修改现有数据的功能 

## V2024.9.26

1. 为软件中的按键添加了圆角设计, 更改了部分控件以及文字的配色 

2. 设计并添加了软件图标 

3. 增加了`另存为`界面新增数据时对数据非空的检查以及提示 

## V2024.9.25

1. 主界面增加了对`number_index`的显示 

2. 在`另存为`界面增加了删除功能, 以及对`number_index`的索引 

## V2024.9.24

1. 改善了项目的结构, 删除了一些无用的文件 

2. 为`code_edit`代码框加入了代码高亮显示 

3. 当搜索`000`时, 表示搜索当前表中的所有数据 

4. 为`另存为`页面加入了选择数据表的功能 

## V2024.9.23

1. 解决了当查询结果有多条时只显示最后一条的问题, 在结果中添加了一条水平线以分隔开不同的结果 

2. 增加了对查询失败或没有查询到结果的提示 

3. 增加了当查询结果有多条时点击保存按钮的提示 

4. 修改了软件的字体为`Cascadia Code`, 字号为12 

5. 新增了为数据库添加新的数据的功能, 点击按钮`另存为`来添加新的数据 

## V2024.9.20

1. 采用了参数化查询, 防止SQL注入风险 

2. 在选择了新的目标语言并且送出查询后, 将会将上一次的查询结果清空 

3. 新增了保存功能, 点击保存按钮后, 可以将修改后的数据保存至表中 

4. 在输入框输入之后, 按下`Enter`键即可触发搜索 

## V2024.9.19

第一个可以正常使用的版本开发完成, 可以通过搜索中文以及英文索引来查找信息; 需要本机安装有`MySQL`, 并且新建数据库`code_database`, 在数据库中新建查询表, 查询表需要具有以下结构: 

```sql
CREATE TABLE C
(
    number_index INT AUTO_INCREMENT,  -- 自动递增列, 数据类型必须为整数
    zh_index VARCHAR(50),
    en_index VARCHAR(50),
    code_snippet TEXT,
    zh_comment TEXT,
    PRIMARY KEY (number_index)  -- 主键必须是 AUTO_INCREMENT 列
);
```

除此之外, 还需要在`QT`的编译器目录下添加编译好的MySQL驱动 

准备工作做完之后, 应该就能正常运行程序了, 程序尚未打包为独立的`.exe`文件, 需要用户自己手动打包 
