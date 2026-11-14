$ErrorActionPreference = 'Stop'
$out = 'd:\Documents\Tencent Files\毕设\毕设\图4-1_系统总体架构图.vsdx'

$visio = New-Object -ComObject Visio.Application
$visio.Visible = $true
$doc = $visio.Documents.Add('')
$page = $doc.Pages.Item(1)
$page.Name = '图4-1 系统总体架构图'

$cGreen  = '#E8F3E0'
$cOrange = '#FCE9D9'
$cBlue   = '#E3EDF8'
$cWhite  = '#FFFFFF'
$cBorder = '#404040'
$cText   = '#1A1A1A'

function New-Box {
    param($x, $y, $w, $h, $fill, $text, $size = 9, $bold = $false)
    $s = $page.DrawRectangle($x, $y, $x + $w, $y + $h)
    $s.CellsU('LineColor').FormulaU = '"' + $cBorder + '"'
    $s.CellsU('LineWeight').FormulaU = '0.75 pt'
    $s.CellsU('FillForegnd').FormulaU = '"' + $fill + '"'
    $s.CellsU('FillPattern').FormulaU = '1'
    $s.CellsU('Rounding').FormulaU = '0 in'
    $s.CellsU('VerticalAlign').FormulaU = '1'
    $s.CellsU('LeftMargin').FormulaU = '0.03 in'
    $s.CellsU('RightMargin').FormulaU = '0.03 in'
    $s.Text = $text
    $s.CellsU('Char.Size').FormulaU = "$size pt"
    $s.CellsU('Char.Color').FormulaU = '"' + $cText + '"'
    if ($bold) { $s.CellsU('Char.Style').FormulaU = '1' }
    return $s
}

$page.PageSheet.CellsU('PageWidth').FormulaU  = '10 in'
$page.PageSheet.CellsU('PageHeight').FormulaU = '7.6 in'

$W = 9.2
$L = 0.4
$R = $L + $W

# ===== 标题 =====
$t = $page.DrawRectangle($L, 6.65, $R, 7.15)
$t.CellsU('LinePattern').FormulaU = '0'
$t.CellsU('FillPattern').FormulaU = '0'
$t.Text = '图4-1  系统总体架构图'
$t.CellsU('Char.Size').FormulaU = '16 pt'
$t.CellsU('Char.Style').FormulaU = '1'
$t.CellsU('Para.HorzAlign').FormulaU = '1'

# ===== 说明文字 =====
$d = $page.DrawRectangle($L, 5.5, $R, 6.5)
$d.CellsU('LinePattern').FormulaU = '0'
$d.CellsU('FillPattern').FormulaU = '0'
$d.Text = '说明：前端采用多页面应用（MPA）方式组织，页面之间以原生 JavaScript 跳转，未使用 Vue Router；表现层通过 Axios 以 JSON 格式调用后端 RESTful 接口；后端按控制层、业务层、数据访问层分层，由 MyBatis-Plus 完成对象与数据表的映射；数据库可通过环境变量在 MySQL 与 PostgreSQL 之间切换。'
$d.CellsU('Char.Size').FormulaU = '9 pt'
$d.CellsU('VerticalAlign').FormulaU = '0'
$d.CellsU('Para.HorzAlign').FormulaU = '0'

# ===== 数据层 =====
$yD = 4.05; $hD = 0.95
New-Box $L $yD $W $hD $cGreen '' | Out-Null
$labD = New-Box ($L + 0.1) ($yD + $hD - 0.26) 4.0 0.22 $cGreen '数据层（MySQL 8.0 主库 · PostgreSQL 演示库）' 10 $true
$labD.CellsU('LinePattern').FormulaU = '0'
$labD.CellsU('Para.HorzAlign').FormulaU = '0'

$cw = 2.76; $gap = 0.26; $cx = $L + 0.22; $cy = $yD + 0.12; $ch = 0.52
New-Box $cx $cy $cw $ch $cWhite "12 张业务数据表`n t_user、t_spot 等" 9 | Out-Null
New-Box ($cx + $cw + $gap) $cy $cw $ch $cWhite "MyBatis-Plus 3.5.5`nMapper 映射" 9 | Out-Null
New-Box ($cx + 2 * ($cw + $gap)) $cy $cw $ch $cWhite "Python 爬虫`n景点与社区数据" 9 | Out-Null

# ===== 业务逻辑层 =====
$yB = 2.70; $hB = 0.95
New-Box $L $yB $W $hB $cOrange '' | Out-Null
$labB = New-Box ($L + 0.1) ($yB + $hB - 0.26) 4.0 0.22 $cOrange '业务逻辑层（Spring Boot 3.2.5 · JDK 17）' 10 $true
$labB.CellsU('LinePattern').FormulaU = '0'
$labB.CellsU('Para.HorzAlign').FormulaU = '0'

$bcw = 1.38; $bgap = (($W - 0.44) - 6 * $bcw) / 5; $bcx = $L + 0.22; $bcy = $yB + 0.12; $bch = 0.50
$controllers = @(
    @('UserController', '用户与令牌'),
    @('SpotController', '景点数据'),
    @('CheckinController', '打卡与评分'),
    @('CommunityController', '社区与评论'),
    @('RecommendController', '推荐计算'),
    @('AdminController', '后台管理')
)
$ctrlShapes = @()
for ($i = 0; $i -lt 6; $i++) {
    $x = $bcx + $i * ($bcw + $bgap)
    $s = New-Box $x $bcy $bcw $bch $cWhite ($controllers[$i][0] + "`n" + $controllers[$i][1]) 8.5
    $ctrlShapes += $s
}

# ===== 表现层 =====
$yP = 1.35; $hP = 0.95
New-Box $L $yP $W $hP $cBlue '' | Out-Null
$labP = New-Box ($L + 0.1) ($yP + $hP - 0.26) 4.6 0.22 $cBlue '表现层（前端 · Vue 3 + HTML / CSS / JavaScript）' 10 $true
$labP.CellsU('LinePattern').FormulaU = '0'
$labP.CellsU('Para.HorzAlign').FormulaU = '0'

$pcw = 2.03; $pgap = (($W - 0.44) - 4 * $pcw) / 3; $pcx = $L + 0.22; $pcy = $yP + 0.12; $pch = 0.52
$present = @(
    @('18 个 HTML 页面', '多页面应用（MPA）'),
    @('Vue 3 数据绑定', 'CDN 引入·无构建'),
    @('ECharts 环球地图', 'Three.js 三维地球'),
    @('Axios 接口请求', 'JSON 数据交换')
)
for ($i = 0; $i -lt 4; $i++) {
    $x = $pcx + $i * ($pcw + $pgap)
    New-Box $x $pcy $pcw $pch $cWhite ($present[$i][0] + "`n" + $present[$i][1]) 9 | Out-Null
}

# ===== 连线：直线、无箭头、两端粘附到层框 =====
function New-Line {
    param($x1, $y1, $x2, $y2)
    $s = $page.DrawLine($x1, $y1, $x2, $y2)
    $s.CellsU('LineColor').FormulaU = '"' + $cBorder + '"'
    $s.CellsU('LineWeight').FormulaU = '0.75 pt'
    $s.CellsU('BeginArrow').FormulaU = '0'
    $s.CellsU('EndArrow').FormulaU = '0'
    return $s
}

$step = $bcw + $bgap
$lx0 = $bcx + 0.69
$lineXs = @($lx0, ($lx0 + 2 * $step), ($lx0 + 4 * $step))
foreach ($x in $lineXs) { New-Line $x ($yB + $hB) $x $yD | Out-Null }
foreach ($x in $lineXs) { New-Line $x ($yP + $hP) $x $yB | Out-Null }

# ===== 层间说明标签 =====
function New-Tag {
    param($x, $y, $w, $text)
    $s = $page.DrawRectangle($x, $y, $x + $w, $y + 0.2)
    $s.CellsU('LinePattern').FormulaU = '0'
    $s.CellsU('FillPattern').FormulaU = '1'
    $s.CellsU('FillForegnd').FormulaU = '"' + $cWhite + '"'
    $s.Text = $text
    $s.CellsU('Char.Size').FormulaU = '8 pt'
    $s.CellsU('VerticalAlign').FormulaU = '1'
    $s.CellsU('Para.HorzAlign').FormulaU = '1'
    return $s
}
New-Tag ($L + 0.30) ($yB + $hB + 0.10) 1.40 'JDBC / MyBatis-Plus' | Out-Null
New-Tag ($L + 0.30) ($yP + $hP + 0.10) 1.80 'HTTP / JSON（RESTful 接口）' | Out-Null

$doc.SaveAs($out)
$doc.Close()
# 用可见窗口打开生成的文件，交由用户检查/编辑
$visio.Documents.Open($out) | Out-Null
$visio.Visible = $true
Write-Output "SAVED: $out"
