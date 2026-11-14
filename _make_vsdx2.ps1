$ErrorActionPreference = 'Stop'
$out = 'd:\Documents\Tencent Files\毕设\毕设\图4-1_系统总体架构图.vsdx'

$cGreen  = '#EAF4E1'
$cOrange = '#FDECDC'
$cBlue   = '#E4EEF9'
$cWhite  = '#FFFFFF'
$cBorder = '#3A3A3A'
$cText   = '#1A1A1A'
$cGold   = '#C0703A'

# 复用已打开的 Visio 实例
$visio = $null
try { $visio = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Visio.Application') } catch { }
if ($visio -eq $null) { $visio = New-Object -ComObject Visio.Application }
$visio.Visible = $true

# 关闭旧文档避免占用
foreach ($d in @($visio.Documents)) {
    if ($d.FullName -eq $out) { $d.Close() }
}

$doc = $visio.Documents.Add('')
$page = $doc.Pages.Item(1)
$page.Name = '图4-1 系统总体架构图'

$page.PageSheet.CellsU('PageWidth').FormulaU  = '10 in'
$page.PageSheet.CellsU('PageHeight').FormulaU = '7.3 in'

function Set-NoShadow($s) {
    $s.CellsU('ShdwPattern').FormulaU = '0'
}

function New-Box {
    param($x, $y, $w, $h, $fill, $text = '', $size = 9, $bold = $false)
    $s = $page.DrawRectangle($x, $y, $x + $w, $y + $h)
    Set-NoShadow $s
    $s.CellsU('LineColor').FormulaU   = '"' + $cBorder + '"'
    $s.CellsU('LineWeight').FormulaU  = '0.75 pt'
    $s.CellsU('LinePattern').FormulaU = '1'
    $s.CellsU('FillForegnd').FormulaU = '"' + $fill + '"'
    $s.CellsU('FillPattern').FormulaU = '1'
    $s.CellsU('Rounding').FormulaU    = '0 in'
    $s.CellsU('VerticalAlign').FormulaU = '1'
    $s.CellsU('LeftMargin').FormulaU  = '0.03 in'
    $s.CellsU('RightMargin').FormulaU = '0.03 in'
    $s.Text = $text
    $s.CellsU('Char.Size').FormulaU  = "$size pt"
    $s.CellsU('Char.Color').FormulaU  = '"' + $cText + '"'
    if ($bold) { $s.CellsU('Char.Style').FormulaU = '1' }
    return $s
}

function New-Line {
    param($x1, $y1, $x2, $y2)
    $s = $page.DrawLine($x1, $y1, $x2, $y2)
    Set-NoShadow $s
    $s.CellsU('LineColor').FormulaU  = '"' + $cBorder + '"'
    $s.CellsU('LineWeight').FormulaU = '0.75 pt'
    $s.CellsU('BeginArrow').FormulaU = '0'
    $s.CellsU('EndArrow').FormulaU   = '0'
    return $s
}

# ===== 标题 =====
$L = 0.45
$W = 9.10
$R = $L + $W
$t = New-Box $L 6.78 $W 0.34 $cWhite '图4-1  系统总体架构图' 16 $true
$t.CellsU('LinePattern').FormulaU = '0'
$t.CellsU('FillPattern').FormulaU = '0'
$t.CellsU('Para.HorzAlign').FormulaU = '1'

# ===== 说明 =====
$d = $page.DrawRectangle($L, 5.55, $R, 6.62)
Set-NoShadow $d
$d.CellsU('LinePattern').FormulaU = '0'
$d.CellsU('FillPattern').FormulaU = '0'
$d.Text = '说明：前端采用多页面应用（MPA）方式组织，页面之间以原生 JavaScript 跳转，未使用 Vue Router；表现层通过 Axios 以 JSON 格式调用后端 RESTful 接口；后端按控制层、业务层、数据访问层分层，由 MyBatis-Plus 完成对象与数据表的映射；数据库可通过环境变量在 MySQL 与 PostgreSQL 之间切换。'
$d.CellsU('Char.Size').FormulaU = '9 pt'
$d.CellsU('VerticalAlign').FormulaU = '0'
$d.CellsU('Para.HorzAlign').FormulaU = '0'

# ===== 数据层 =====
$yD = 4.15; $hD = 0.90
New-Box $L $yD $W $hD $cGreen '' | Out-Null
$labD = New-Box ($L + 0.12) ($yD + $hD - 0.27) 4.10 0.24 $cGreen '数据层（MySQL 8.0 主库 · PostgreSQL 演示库）' 10 $true
$labD.CellsU('LinePattern').FormulaU = '0'
$labD.CellsU('Para.HorzAlign').FormulaU = '0'

$cw = 2.72; $gap = (($W - 0.36) - 3 * $cw) / 2; $cx = $L + 0.18; $cy = $yD + 0.10; $ch = 0.48
New-Box $cx $cy $cw $ch $cWhite "12 张业务数据表`n t_user、t_spot 等" 9 | Out-Null
New-Box ($cx + $cw + $gap) $cy $cw $ch $cWhite "MyBatis-Plus 3.5.5`nMapper 映射" 9 | Out-Null
New-Box ($cx + 2 * ($cw + $gap)) $cy $cw $ch $cWhite "Python 爬虫`n景点与社区数据" 9 | Out-Null
$boxData = @($cx, ($cx + $cw + $gap), ($cx + 2 * ($cw + $gap)))

# ===== 业务逻辑层 =====
$yB = 2.72; $hB = 0.92
New-Box $L $yB $W $hB $cOrange '' | Out-Null
$labB = New-Box ($L + 0.12) ($yB + $hB - 0.27) 4.10 0.24 $cOrange '业务逻辑层（Spring Boot 3.2.5 · JDK 17）' 10 $true
$labB.CellsU('LinePattern').FormulaU = '0'
$labB.CellsU('Para.HorzAlign').FormulaU = '0'

$bcw = 1.34; $bgap = (($W - 0.36) - 6 * $bcw) / 5; $bcx = $L + 0.18; $bcy = $yB + 0.10; $bch = 0.44
$controllers = @(
    @('UserController', '用户与令牌'),
    @('SpotController', '景点数据'),
    @('CheckinController', '打卡与评分'),
    @('CommunityController', '社区与评论'),
    @('RecommendController', '推荐计算'),
    @('AdminController', '后台管理')
)
for ($i = 0; $i -lt 6; $i++) {
    $x = $bcx + $i * ($bcw + $bgap)
    New-Box $x $bcy $bcw $bch $cWhite ($controllers[$i][0] + "`n" + $controllers[$i][1]) 8 | Out-Null
}

# ===== 表现层 =====
$yP = 1.30; $hP = 0.92
New-Box $L $yP $W $hP $cBlue '' | Out-Null
$labP = New-Box ($L + 0.12) ($yP + $hP - 0.27) 4.60 0.24 $cBlue '表现层（前端 · Vue 3 + HTML / CSS / JavaScript）' 10 $true
$labP.CellsU('LinePattern').FormulaU = '0'
$labP.CellsU('Para.HorzAlign').FormulaU = '0'

$pcw = 2.00; $pgap = (($W - 0.36) - 4 * $pcw) / 3; $pcx = $L + 0.18; $pcy = $yP + 0.10; $pch = 0.48
$present = @(
    @('18 个 HTML 页面', '多页面应用（MPA）'),
    @('Vue 3 数据绑定', 'CDN 引入·无构建'),
    @('ECharts 环球地图', 'Three.js 三维地球'),
    @('Axios 接口请求', 'JSON 数据交换')
)
$boxPres = @()
for ($i = 0; $i -lt 4; $i++) {
    $x = $pcx + $i * ($pcw + $pgap)
    New-Box $x $pcy $pcw $pch $cWhite ($present[$i][0] + "`n" + $present[$i][1]) 9 | Out-Null
    $boxPres += ($x + $pcw / 2)
}

# ===== 连线：每个对应方框一根竖直直线，两端直接连到层框边线，无箭头 =====
$boxCtrl = @()
for ($i = 0; $i -lt 6; $i++) { $boxCtrl += ($bcx + $i * ($bcw + $bgap) + $bcw / 2) }

$lowXs  = @($boxPres[0], $boxCtrl[1], $boxCtrl[4])
$upXs   = @($boxCtrl[1], $boxCtrl[2], $boxCtrl[4])
foreach ($x in $lowXs) { New-Line $x ($yP + $hP) $x $yB | Out-Null }
foreach ($x in $upXs)  { New-Line $x ($yB + $hB) $x $yD | Out-Null }

# ===== 层间标签：置于空带中，白底无边 =====
function New-Tag {
    param($x, $y, $w, $text)
    $s = $page.DrawRectangle($x, $y, $x + $w, $y + 0.19)
    Set-NoShadow $s
    $s.CellsU('LinePattern').FormulaU = '0'
    $s.CellsU('FillPattern').FormulaU = '0'
    $s.Text = $text
    $s.CellsU('Char.Size').FormulaU = '8.5 pt'
    $s.CellsU('VerticalAlign').FormulaU = '1'
    $s.CellsU('Para.HorzAlign').FormulaU = '1'
    return $s
}
New-Tag 3.55 3.70 2.10 'JDBC / MyBatis-Plus' | Out-Null
New-Tag 3.55 2.28 2.40 'HTTP / JSON（RESTful 接口）' | Out-Null

$doc.SaveAs($out)
Write-Output "SAVED: $out"
