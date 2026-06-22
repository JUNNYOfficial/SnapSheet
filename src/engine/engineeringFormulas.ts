import type { ASTNode } from '../types';

/**
 * 工程领域专业公式库
 *
 * 本模块系统性收录机械工程、电气工程、土木工程、材料工程及热力学/流体力学
 * 等领域常用公式。所有公式优先采用行业标准和权威教材中的规范表达，参数与
 * 返回值均标注常用国际单位制（SI）单位。复杂公式提供分步推导说明，并在注释
 * 中给出典型应用场景。
 *
 * 使用方法：在 Evaluator.ts 中通过 engineeringFormulas.get(name) 获取处理器。
 */

export interface FormulaContext {
  /** 求值任意 AST 节点 */
  evalNode: (node: ASTNode) => number | string;
  /** 求值单元格引用 */
  evalCell: (ref: string) => number | string;
  /** 将 range/cell 节点展开为单元格引用数组 */
  getRangeArg: (node: ASTNode) => string[] | null;
  /** 将值转换为浮点数 */
  toNumber: (value: number | string) => number;
  /** 将值转换为整数 */
  toInteger: (value: number | string) => number;
}

export type FormulaHandler = (args: ASTNode[], ctx: FormulaContext) => number | string;

const assertCount = (args: ASTNode[], min: number, msg = '#VALUE!') =>
  args.length < min ? msg : null;

const num = (args: ASTNode[], idx: number, ctx: FormulaContext): number => {
  const v = ctx.evalNode(args[idx]);
  return typeof v === 'number' ? v : parseFloat(v);
};

// ==================== 机械工程公式（30个）====================

const mechanicalFormulas: Array<[string, FormulaHandler]> = [
  /**
   * 匀速直线运动速度公式
   * v = s / t
   * @param s 位移，单位 m
   * @param t 时间，单位 s
   * @returns 速度 v，单位 m/s
   * @适用条件 匀速直线运动
   */
  ['VELOCITY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const s = num(args, 0, ctx);
    const t = num(args, 1, ctx);
    return isNaN(s) || isNaN(t) || t === 0 ? '#VALUE!' : s / t;
  }],

  /**
   * 加速度定义式
   * a = Δv / Δt
   * @param v2 末速度，单位 m/s
   * @param v1 初速度，单位 m/s
   * @param t 时间，单位 s
   * @returns 加速度 a，单位 m/s²
   */
  ['ACCELERATION', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const v2 = num(args, 0, ctx);
    const v1 = num(args, 1, ctx);
    const t = num(args, 2, ctx);
    return isNaN(v2) || isNaN(v1) || isNaN(t) || t === 0 ? '#VALUE!' : (v2 - v1) / t;
  }],

  /**
   * 牛顿第二定律
   * F = m · a
   * @param m 质量，单位 kg
   * @param a 加速度，单位 m/s²
   * @returns 力 F，单位 N
   */
  ['FORCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const m = num(args, 0, ctx);
    const a = num(args, 1, ctx);
    return isNaN(m) || isNaN(a) ? '#VALUE!' : m * a;
  }],

  /**
   * 重量公式
   * W = m · g
   * @param m 质量，单位 kg
   * @param g 重力加速度，默认 9.80665 m/s²
   * @returns 重量 W，单位 N
   */
  ['WEIGHT', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const m = num(args, 0, ctx);
    const g = args.length >= 2 ? num(args, 1, ctx) : 9.80665;
    return isNaN(m) || isNaN(g) ? '#VALUE!' : m * g;
  }],

  /**
   * 功的定义式
   * W = F · d
   * @param F 力，单位 N
   * @param d 位移，单位 m
   * @returns 功 W，单位 J
   */
  ['WORK', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const F = num(args, 0, ctx);
    const d = num(args, 1, ctx);
    return isNaN(F) || isNaN(d) ? '#VALUE!' : F * d;
  }],

  /**
   * 平均功率
   * P = W / t
   * @param W 功，单位 J
   * @param t 时间，单位 s
   * @returns 功率 P，单位 W
   */
  ['POWER', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const W = num(args, 0, ctx);
    const t = num(args, 1, ctx);
    return isNaN(W) || isNaN(t) || t === 0 ? '#VALUE!' : W / t;
  }],

  /**
   * 动能公式
   * Ek = ½ m v²
   * @param m 质量，单位 kg
   * @param v 速度，单位 m/s
   * @returns 动能 Ek，单位 J
   */
  ['KINETIC_ENERGY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const m = num(args, 0, ctx);
    const v = num(args, 1, ctx);
    return isNaN(m) || isNaN(v) ? '#VALUE!' : 0.5 * m * v * v;
  }],

  /**
   * 重力势能公式
   * Ep = m · g · h
   * @param m 质量，单位 kg
   * @param h 高度，单位 m
   * @param g 重力加速度，默认 9.80665 m/s²
   * @returns 势能 Ep，单位 J
   */
  ['POTENTIAL_ENERGY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const m = num(args, 0, ctx);
    const h = num(args, 1, ctx);
    const g = args.length >= 3 ? num(args, 2, ctx) : 9.80665;
    return isNaN(m) || isNaN(h) || isNaN(g) ? '#VALUE!' : m * g * h;
  }],

  /**
   * 动量公式
   * p = m · v
   * @param m 质量，单位 kg
   * @param v 速度，单位 m/s
   * @returns 动量 p，单位 kg·m/s
   */
  ['MOMENTUM', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const m = num(args, 0, ctx);
    const v = num(args, 1, ctx);
    return isNaN(m) || isNaN(v) ? '#VALUE!' : m * v;
  }],

  /**
   * 扭矩公式
   * T = F · r
   * @param F 力，单位 N
   * @param r 力臂半径，单位 m
   * @returns 扭矩 T，单位 N·m
   */
  ['TORQUE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const F = num(args, 0, ctx);
    const r = num(args, 1, ctx);
    return isNaN(F) || isNaN(r) ? '#VALUE!' : F * r;
  }],

  /**
   * 压强公式
   * P = F / A
   * @param F 力，单位 N
   * @param A 面积，单位 m²
   * @returns 压强 P，单位 Pa
   */
  ['PRESSURE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const F = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    return isNaN(F) || isNaN(A) || A === 0 ? '#VALUE!' : F / A;
  }],

  /**
   * 正应力公式
   * σ = F / A
   * @param F 轴向力，单位 N
   * @param A 横截面积，单位 m²
   * @returns 应力 σ，单位 Pa
   */
  ['STRESS', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const F = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    return isNaN(F) || isNaN(A) || A === 0 ? '#VALUE!' : F / A;
  }],

  /**
   * 线应变公式
   * ε = ΔL / L0
   * @param dL 长度变化量，单位 m
   * @param L0 原长，单位 m
   * @returns 应变 ε，无量纲
   */
  ['STRAIN', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const dL = num(args, 0, ctx);
    const L0 = num(args, 1, ctx);
    return isNaN(dL) || isNaN(L0) || L0 === 0 ? '#VALUE!' : dL / L0;
  }],

  /**
   * 杨氏模量（弹性模量）
   * E = σ / ε
   * @param stress 应力，单位 Pa
   * @param strain 应变，无量纲
   * @returns 杨氏模量 E，单位 Pa
   */
  ['YOUNGS_MODULUS', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const stress = num(args, 0, ctx);
    const strain = num(args, 1, ctx);
    return isNaN(stress) || isNaN(strain) || strain === 0 ? '#VALUE!' : stress / strain;
  }],

  /**
   * 泊松比
   * ν = -ε_transverse / ε_axial
   * @param transverseStrain 横向应变，无量纲
   * @param axialStrain 轴向应变，无量纲
   * @returns 泊松比 ν，无量纲
   */
  ['POISSON_RATIO', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const et = num(args, 0, ctx);
    const ea = num(args, 1, ctx);
    return isNaN(et) || isNaN(ea) || ea === 0 ? '#VALUE!' : -et / ea;
  }],

  /**
   * 剪切应力
   * τ = V / A
   * @param V 剪力，单位 N
   * @param A 剪切面积，单位 m²
   * @returns 剪切应力 τ，单位 Pa
   */
  ['SHEAR_STRESS', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    return isNaN(V) || isNaN(A) || A === 0 ? '#VALUE!' : V / A;
  }],

  /**
   * 剪切应变
   * γ = Δx / h
   * @param dx 剪切位移，单位 m
   * @param h 高度，单位 m
   * @returns 剪切应变 γ，无量纲
   */
  ['SHEAR_STRAIN', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const dx = num(args, 0, ctx);
    const h = num(args, 1, ctx);
    return isNaN(dx) || isNaN(h) || h === 0 ? '#VALUE!' : dx / h;
  }],

  /**
   * 体积模量
   * K = -V0 · ΔP / ΔV
   * @param dP 压力变化，单位 Pa
   * @param dV 体积变化，单位 m³
   * @param V0 初始体积，单位 m³
   * @returns 体积模量 K，单位 Pa
   */
  ['BULK_MODULUS', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const dP = num(args, 0, ctx);
    const dV = num(args, 1, ctx);
    const V0 = num(args, 2, ctx);
    return isNaN(dP) || isNaN(dV) || isNaN(V0) || dV === 0 ? '#VALUE!' : -V0 * dP / dV;
  }],

  /**
   * 胡克定律（弹簧力）
   * F = k · x
   * @param k 弹簧刚度，单位 N/m
   * @param x 变形量，单位 m
   * @returns 弹簧力 F，单位 N
   */
  ['SPRING_FORCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const k = num(args, 0, ctx);
    const x = num(args, 1, ctx);
    return isNaN(k) || isNaN(x) ? '#VALUE!' : k * x;
  }],

  /**
   * 弹簧弹性势能
   * Es = ½ k x²
   * @param k 弹簧刚度，单位 N/m
   * @param x 变形量，单位 m
   * @returns 弹性势能 Es，单位 J
   */
  ['SPRING_ENERGY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const k = num(args, 0, ctx);
    const x = num(args, 1, ctx);
    return isNaN(k) || isNaN(x) ? '#VALUE!' : 0.5 * k * x * x;
  }],

  /**
   * 频率与周期关系
   * f = 1 / T
   * @param T 周期，单位 s
   * @returns 频率 f，单位 Hz
   */
  ['FREQUENCY', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const T = num(args, 0, ctx);
    return isNaN(T) || T === 0 ? '#VALUE!' : 1 / T;
  }],

  /**
   * 角速度
   * ω = 2π / T = 2πf
   * @param f 频率，单位 Hz
   * @returns 角速度 ω，单位 rad/s
   */
  ['ANGULAR_VELOCITY', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const f = num(args, 0, ctx);
    return isNaN(f) ? '#VALUE!' : 2 * Math.PI * f;
  }],

  /**
   * 角加速度
   * α = Δω / Δt
   * @param w2 末角速度，单位 rad/s
   * @param w1 初角速度，单位 rad/s
   * @param t 时间，单位 s
   * @returns 角加速度 α，单位 rad/s²
   */
  ['ANGULAR_ACCELERATION', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const w2 = num(args, 0, ctx);
    const w1 = num(args, 1, ctx);
    const t = num(args, 2, ctx);
    return isNaN(w2) || isNaN(w1) || isNaN(t) || t === 0 ? '#VALUE!' : (w2 - w1) / t;
  }],

  /**
   * 向心力
   * Fc = m v² / r
   * @param m 质量，单位 kg
   * @param v 线速度，单位 m/s
   * @param r 半径，单位 m
   * @returns 向心力 Fc，单位 N
   */
  ['CENTRIPETAL_FORCE', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const m = num(args, 0, ctx);
    const v = num(args, 1, ctx);
    const r = num(args, 2, ctx);
    return isNaN(m) || isNaN(v) || isNaN(r) || r === 0 ? '#VALUE!' : m * v * v / r;
  }],

  /**
   * 向心加速度
   * ac = v² / r
   * @param v 线速度，单位 m/s
   * @param r 半径，单位 m
   * @returns 向心加速度 ac，单位 m/s²
   */
  ['CENTRIPETAL_ACCELERATION', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const v = num(args, 0, ctx);
    const r = num(args, 1, ctx);
    return isNaN(v) || isNaN(r) || r === 0 ? '#VALUE!' : v * v / r;
  }],

  /**
   * 齿轮传动比
   * i = N2 / N1 = D2 / D1
   * @param nDriver 主动轮齿数
   * @param nDriven 从动轮齿数
   * @returns 传动比 i，无量纲
   */
  ['GEAR_RATIO', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const nDriver = num(args, 0, ctx);
    const nDriven = num(args, 1, ctx);
    return isNaN(nDriver) || isNaN(nDriven) || nDriver === 0 ? '#VALUE!' : nDriven / nDriver;
  }],

  /**
   * 皮带/滑轮传动比
   * i = D_driven / D_driver
   * @param dDriver 主动轮直径，单位 m
   * @param dDriven 从动轮直径，单位 m
   * @returns 传动比 i，无量纲
   */
  ['PULLEY_RATIO', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const dDriver = num(args, 0, ctx);
    const dDriven = num(args, 1, ctx);
    return isNaN(dDriver) || isNaN(dDriven) || dDriver === 0 ? '#VALUE!' : dDriven / dDriver;
  }],

  /**
   * 机械利益
   * MA = F_out / F_in
   * @param fOut 输出力，单位 N
   * @param fIn 输入力，单位 N
   * @returns 机械利益 MA，无量纲
   */
  ['MECHANICAL_ADVANTAGE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const fOut = num(args, 0, ctx);
    const fIn = num(args, 1, ctx);
    return isNaN(fOut) || isNaN(fIn) || fIn === 0 ? '#VALUE!' : fOut / fIn;
  }],

  /**
   * 机械效率
   * η = P_out / P_in × 100%
   * @param pOut 输出功率，单位 W
   * @param pIn 输入功率，单位 W
   * @returns 效率 η，单位 %
   */
  ['EFFICIENCY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const pOut = num(args, 0, ctx);
    const pIn = num(args, 1, ctx);
    return isNaN(pOut) || isNaN(pIn) || pIn === 0 ? '#VALUE!' : (pOut / pIn) * 100;
  }],

  /**
   * 滑动摩擦力
   * Ff = μ · N
   * @param mu 摩擦系数，无量纲
   * @param N 法向力，单位 N
   * @returns 摩擦力 Ff，单位 N
   */
  ['FRICTION_FORCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const mu = num(args, 0, ctx);
    const N = num(args, 1, ctx);
    return isNaN(mu) || isNaN(N) ? '#VALUE!' : mu * N;
  }],
];

// ==================== 电气工程公式（30个）====================

const electricalFormulas: Array<[string, FormulaHandler]> = [
  /**
   * 欧姆定律求电压
   * V = I · R
   * @param I 电流，单位 A
   * @param R 电阻，单位 Ω
   * @returns 电压 V，单位 V
   */
  ['OHM_V', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const I = num(args, 0, ctx);
    const R = num(args, 1, ctx);
    return isNaN(I) || isNaN(R) ? '#VALUE!' : I * R;
  }],

  /**
   * 欧姆定律求电流
   * I = V / R
   * @param V 电压，单位 V
   * @param R 电阻，单位 Ω
   * @returns 电流 I，单位 A
   */
  ['OHM_I', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V = num(args, 0, ctx);
    const R = num(args, 1, ctx);
    return isNaN(V) || isNaN(R) || R === 0 ? '#VALUE!' : V / R;
  }],

  /**
   * 欧姆定律求电阻
   * R = V / I
   * @param V 电压，单位 V
   * @param I 电流，单位 A
   * @returns 电阻 R，单位 Ω
   */
  ['OHM_R', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V = num(args, 0, ctx);
    const I = num(args, 1, ctx);
    return isNaN(V) || isNaN(I) || I === 0 ? '#VALUE!' : V / I;
  }],

  /**
   * 电功率（直流）
   * P = V · I
   * @param V 电压，单位 V
   * @param I 电流，单位 A
   * @returns 功率 P，单位 W
   */
  ['POWER_ELECTRIC', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V = num(args, 0, ctx);
    const I = num(args, 1, ctx);
    return isNaN(V) || isNaN(I) ? '#VALUE!' : V * I;
  }],

  /**
   * 串联电阻等效值
   * R_eq = R1 + R2 + ...
   * @param args 多个电阻值，单位 Ω
   * @returns 等效电阻，单位 Ω
   */
  ['RESISTORS_SERIES', (args, ctx) => {
    if (args.length === 0) return '#VALUE!';
    let sum = 0;
    for (const arg of args) {
      const v = num([arg], 0, ctx);
      if (isNaN(v)) return '#VALUE!';
      sum += v;
    }
    return sum;
  }],

  /**
   * 并联电阻等效值
   * 1/R_eq = 1/R1 + 1/R2 + ...
   * @param args 多个电阻值，单位 Ω
   * @returns 等效电阻，单位 Ω
   */
  ['RESISTORS_PARALLEL', (args, ctx) => {
    if (args.length === 0) return '#VALUE!';
    let sumReciprocal = 0;
    for (const arg of args) {
      const v = num([arg], 0, ctx);
      if (isNaN(v) || v === 0) return '#VALUE!';
      sumReciprocal += 1 / v;
    }
    return 1 / sumReciprocal;
  }],

  /**
   * 串联电容等效值
   * 1/C_eq = 1/C1 + 1/C2 + ...
   * @param args 多个电容值，单位 F
   * @returns 等效电容，单位 F
   */
  ['CAPACITORS_SERIES', (args, ctx) => {
    if (args.length === 0) return '#VALUE!';
    let sumReciprocal = 0;
    for (const arg of args) {
      const v = num([arg], 0, ctx);
      if (isNaN(v) || v === 0) return '#VALUE!';
      sumReciprocal += 1 / v;
    }
    return 1 / sumReciprocal;
  }],

  /**
   * 并联电容等效值
   * C_eq = C1 + C2 + ...
   * @param args 多个电容值，单位 F
   * @returns 等效电容，单位 F
   */
  ['CAPACITORS_PARALLEL', (args, ctx) => {
    if (args.length === 0) return '#VALUE!';
    let sum = 0;
    for (const arg of args) {
      const v = num([arg], 0, ctx);
      if (isNaN(v)) return '#VALUE!';
      sum += v;
    }
    return sum;
  }],

  /**
   * 串联电感等效值
   * L_eq = L1 + L2 + ...
   * @param args 多个电感值，单位 H
   * @returns 等效电感，单位 H
   */
  ['INDUCTORS_SERIES', (args, ctx) => {
    if (args.length === 0) return '#VALUE!';
    let sum = 0;
    for (const arg of args) {
      const v = num([arg], 0, ctx);
      if (isNaN(v)) return '#VALUE!';
      sum += v;
    }
    return sum;
  }],

  /**
   * 并联电感等效值
   * 1/L_eq = 1/L1 + 1/L2 + ...
   * @param args 多个电感值，单位 H
   * @returns 等效电感，单位 H
   */
  ['INDUCTORS_PARALLEL', (args, ctx) => {
    if (args.length === 0) return '#VALUE!';
    let sumReciprocal = 0;
    for (const arg of args) {
      const v = num([arg], 0, ctx);
      if (isNaN(v) || v === 0) return '#VALUE!';
      sumReciprocal += 1 / v;
    }
    return 1 / sumReciprocal;
  }],

  /**
   * 容抗
   * Xc = 1 / (2πfC)
   * @param f 频率，单位 Hz
   * @param C 电容，单位 F
   * @returns 容抗 Xc，单位 Ω
   */
  ['CAPACITIVE_REACTANCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const f = num(args, 0, ctx);
    const C = num(args, 1, ctx);
    return isNaN(f) || isNaN(C) || f === 0 || C === 0 ? '#VALUE!' : 1 / (2 * Math.PI * f * C);
  }],

  /**
   * 感抗
   * Xl = 2πfL
   * @param f 频率，单位 Hz
   * @param L 电感，单位 H
   * @returns 感抗 Xl，单位 Ω
   */
  ['INDUCTIVE_REACTANCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const f = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    return isNaN(f) || isNaN(L) ? '#VALUE!' : 2 * Math.PI * f * L;
  }],

  /**
   * RL 串联阻抗
   * Z = √(R² + Xl²)
   * @param R 电阻，单位 Ω
   * @param Xl 感抗，单位 Ω
   * @returns 阻抗 Z，单位 Ω
   */
  ['IMPEDANCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const R = num(args, 0, ctx);
    const X = num(args, 1, ctx);
    return isNaN(R) || isNaN(X) ? '#VALUE!' : Math.sqrt(R * R + X * X);
  }],

  /**
   * LC 谐振频率
   * f0 = 1 / (2π√(LC))
   * @param L 电感，单位 H
   * @param C 电容，单位 F
   * @returns 谐振频率 f0，单位 Hz
   */
  ['RESONANT_FREQ', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const L = num(args, 0, ctx);
    const C = num(args, 1, ctx);
    return isNaN(L) || isNaN(C) || L <= 0 || C <= 0 ? '#VALUE!' : 1 / (2 * Math.PI * Math.sqrt(L * C));
  }],

  /**
   * RC 时间常数
   * τ = R · C
   * @param R 电阻，单位 Ω
   * @param C 电容，单位 F
   * @returns 时间常数 τ，单位 s
   */
  ['RC_TIME_CONSTANT', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const R = num(args, 0, ctx);
    const C = num(args, 1, ctx);
    return isNaN(R) || isNaN(C) ? '#VALUE!' : R * C;
  }],

  /**
   * RL 时间常数
   * τ = L / R
   * @param L 电感，单位 H
   * @param R 电阻，单位 Ω
   * @returns 时间常数 τ，单位 s
   */
  ['RL_TIME_CONSTANT', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const L = num(args, 0, ctx);
    const R = num(args, 1, ctx);
    return isNaN(L) || isNaN(R) || R === 0 ? '#VALUE!' : L / R;
  }],

  /**
   * LC 振荡角频率
   * ω = 1 / √(LC)
   * @param L 电感，单位 H
   * @param C 电容，单位 F
   * @returns 角频率 ω，单位 rad/s
   */
  ['LC_FREQ_ANGULAR', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const L = num(args, 0, ctx);
    const C = num(args, 1, ctx);
    return isNaN(L) || isNaN(C) || L <= 0 || C <= 0 ? '#VALUE!' : 1 / Math.sqrt(L * C);
  }],

  /**
   * 正弦波有效值（RMS）
   * Vrms = Vpeak / √2
   * @param peak 峰值，单位 V 或 A
   * @returns 有效值，单位 V 或 A
   */
  ['RMS', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const peak = num(args, 0, ctx);
    return isNaN(peak) ? '#VALUE!' : peak / Math.sqrt(2);
  }],

  /**
   * 峰值转有效值
   * Vrms = Vpeak · k
   * @param peak 峰值
   * @param crestFactor 波峰因数，默认 √2（正弦波）
   * @returns 有效值
   */
  ['PEAK_TO_RMS', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const peak = num(args, 0, ctx);
    const k = args.length >= 2 ? num(args, 1, ctx) : Math.sqrt(2);
    return isNaN(peak) || isNaN(k) || k === 0 ? '#VALUE!' : peak / k;
  }],

  /**
   * 功率因数
   * PF = cos(θ) = R / Z
   * @param R 电阻，单位 Ω
   * @param Z 阻抗，单位 Ω
   * @returns 功率因数，无量纲
   */
  ['POWER_FACTOR', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const R = num(args, 0, ctx);
    const Z = num(args, 1, ctx);
    return isNaN(R) || isNaN(Z) || Z === 0 ? '#VALUE!' : R / Z;
  }],

  /**
   * 视在功率
   * S = V · I
   * @param V 电压，单位 V
   * @param I 电流，单位 A
   * @returns 视在功率 S，单位 VA
   */
  ['APPARENT_POWER', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V = num(args, 0, ctx);
    const I = num(args, 1, ctx);
    return isNaN(V) || isNaN(I) ? '#VALUE!' : V * I;
  }],

  /**
   * 无功功率
   * Q = √(S² - P²)
   * @param S 视在功率，单位 VA
   * @param P 有功功率，单位 W
   * @returns 无功功率 Q，单位 var
   */
  ['REACTIVE_POWER', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const S = num(args, 0, ctx);
    const P = num(args, 1, ctx);
    return isNaN(S) || isNaN(P) || S * S < P * P ? '#VALUE!' : Math.sqrt(S * S - P * P);
  }],

  /**
   * 电导
   * G = 1 / R
   * @param R 电阻，单位 Ω
   * @returns 电导 G，单位 S
   */
  ['CONDUCTANCE', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const R = num(args, 0, ctx);
    return isNaN(R) || R === 0 ? '#VALUE!' : 1 / R;
  }],

  /**
   * 电容性电纳
   * Bc = 2πfC
   * @param f 频率，单位 Hz
   * @param C 电容，单位 F
   * @returns 电纳 Bc，单位 S
   */
  ['SUSCEPTANCE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const f = num(args, 0, ctx);
    const C = num(args, 1, ctx);
    return isNaN(f) || isNaN(C) ? '#VALUE!' : 2 * Math.PI * f * C;
  }],

  /**
   * 导纳
   * Y = 1 / Z
   * @param Z 阻抗，单位 Ω
   * @returns 导纳 Y，单位 S
   */
  ['ADMITTANCE', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const Z = num(args, 0, ctx);
    return isNaN(Z) || Z === 0 ? '#VALUE!' : 1 / Z;
  }],

  /**
   * 电磁波波长
   * λ = c / f
   * @param f 频率，单位 Hz
   * @param c 波速，默认光速 299792458 m/s
   * @returns 波长 λ，单位 m
   */
  ['WAVELENGTH', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const f = num(args, 0, ctx);
    const c = args.length >= 2 ? num(args, 1, ctx) : 299792458;
    return isNaN(f) || isNaN(c) || f === 0 ? '#VALUE!' : c / f;
  }],

  /**
   * 功率分贝
   * dB = 10 · log10(P2/P1)
   * @param P2 输出功率，单位 W
   * @param P1 参考功率，单位 W
   * @returns 分贝 dB
   */
  ['DECIBEL_POWER', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const P2 = num(args, 0, ctx);
    const P1 = num(args, 1, ctx);
    return isNaN(P2) || isNaN(P1) || P1 <= 0 || P2 <= 0 ? '#VALUE!' : 10 * Math.log10(P2 / P1);
  }],

  /**
   * 电压/电流分贝
   * dB = 20 · log10(V2/V1)
   * @param V2 输出电压，单位 V
   * @param V1 参考电压，单位 V
   * @returns 分贝 dB
   */
  ['DECIBEL_VOLTAGE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V2 = num(args, 0, ctx);
    const V1 = num(args, 1, ctx);
    return isNaN(V2) || isNaN(V1) || V1 <= 0 || V2 <= 0 ? '#VALUE!' : 20 * Math.log10(V2 / V1);
  }],

  /**
   * 衰减系数
   * α = -20 · log10(Vout/Vin)
   * @param Vin 输入电压，单位 V
   * @param Vout 输出电压，单位 V
   * @returns 衰减量 dB
   */
  ['ATTENUATION', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const Vin = num(args, 0, ctx);
    const Vout = num(args, 1, ctx);
    return isNaN(Vin) || isNaN(Vout) || Vin <= 0 || Vout <= 0 ? '#VALUE!' : -20 * Math.log10(Vout / Vin);
  }],

  /**
   * 电阻分压器输出电压
   * Vout = Vin · R2 / (R1 + R2)
   * @param Vin 输入电压，单位 V
   * @param R1 上端电阻，单位 Ω
   * @param R2 下端电阻，单位 Ω
   * @returns 输出电压 Vout，单位 V
   */
  ['VOLTAGE_DIVIDER', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const Vin = num(args, 0, ctx);
    const R1 = num(args, 1, ctx);
    const R2 = num(args, 2, ctx);
    return isNaN(Vin) || isNaN(R1) || isNaN(R2) || R1 + R2 === 0 ? '#VALUE!' : Vin * R2 / (R1 + R2);
  }],
];

// ==================== 土木工程公式（25个）====================

const civilFormulas: Array<[string, FormulaHandler]> = [
  /**
   * 简支梁中点集中荷载最大弯矩
   * M = P · L / 4
   * @param P 集中荷载，单位 N
   * @param L 跨度，单位 m
   * @returns 弯矩 M，单位 N·m
   */
  ['BEAM_MOMENT_CENTRAL', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const P = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    return isNaN(P) || isNaN(L) ? '#VALUE!' : P * L / 4;
  }],

  /**
   * 简支梁中点集中荷载最大挠度
   * δ = P · L³ / (48 E I)
   * @param P 集中荷载，单位 N
   * @param L 跨度，单位 m
   * @param E 弹性模量，单位 Pa
   * @param I 截面惯性矩，单位 m⁴
   * @returns 挠度 δ，单位 m
   */
  ['BEAM_DEFLECTION_CENTRAL', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const P = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    const E = num(args, 2, ctx);
    const I = num(args, 3, ctx);
    return isNaN(P) || isNaN(L) || isNaN(E) || isNaN(I) || E === 0 || I === 0 ? '#VALUE!' : P * Math.pow(L, 3) / (48 * E * I);
  }],

  /**
   * 简支梁均布荷载跨中弯矩
   * M = w · L² / 8
   * @param w 均布荷载，单位 N/m
   * @param L 跨度，单位 m
   * @returns 弯矩 M，单位 N·m
   */
  ['BEAM_MOMENT_UNIFORM', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const w = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    return isNaN(w) || isNaN(L) ? '#VALUE!' : w * L * L / 8;
  }],

  /**
   * 简支梁均布荷载跨中挠度
   * δ = 5 w L⁴ / (384 E I)
   * @param w 均布荷载，单位 N/m
   * @param L 跨度，单位 m
   * @param E 弹性模量，单位 Pa
   * @param I 截面惯性矩，单位 m⁴
   * @returns 挠度 δ，单位 m
   */
  ['BEAM_DEFLECTION_UNIFORM', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const w = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    const E = num(args, 2, ctx);
    const I = num(args, 3, ctx);
    return isNaN(w) || isNaN(L) || isNaN(E) || isNaN(I) || E === 0 || I === 0 ? '#VALUE!' : 5 * w * Math.pow(L, 4) / (384 * E * I);
  }],

  /**
   * 悬臂梁端部集中荷载最大弯矩
   * M = P · L
   * @param P 集中荷载，单位 N
   * @param L 悬臂长度，单位 m
   * @returns 弯矩 M，单位 N·m
   */
  ['CANTILEVER_MOMENT_END', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const P = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    return isNaN(P) || isNaN(L) ? '#VALUE!' : P * L;
  }],

  /**
   * 悬臂梁端部集中荷载挠度
   * δ = P · L³ / (3 E I)
   * @param P 集中荷载，单位 N
   * @param L 悬臂长度，单位 m
   * @param E 弹性模量，单位 Pa
   * @param I 截面惯性矩，单位 m⁴
   * @returns 挠度 δ，单位 m
   */
  ['CANTILEVER_DEFLECTION_END', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const P = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    const E = num(args, 2, ctx);
    const I = num(args, 3, ctx);
    return isNaN(P) || isNaN(L) || isNaN(E) || isNaN(I) || E === 0 || I === 0 ? '#VALUE!' : P * Math.pow(L, 3) / (3 * E * I);
  }],

  /**
   * 欧拉临界屈曲荷载
   * Pcr = π² E I / (K L)²
   * @param E 弹性模量，单位 Pa
   * @param I 截面惯性矩，单位 m⁴
   * @param L 柱长，单位 m
   * @param K 长度系数，默认 1.0
   * @returns 临界荷载 Pcr，单位 N
   */
  ['COLUMN_BUCKLING', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const E = num(args, 0, ctx);
    const I = num(args, 1, ctx);
    const L = num(args, 2, ctx);
    const K = args.length >= 4 ? num(args, 3, ctx) : 1;
    return isNaN(E) || isNaN(I) || isNaN(L) || isNaN(K) || L === 0 || K === 0 ? '#VALUE!' : Math.pow(Math.PI, 2) * E * I / Math.pow(K * L, 2);
  }],

  /**
   * 长细比
   * λ = K L / r
   * @param K 长度系数
   * @param L 长度，单位 m
   * @param r 截面回转半径，单位 m
   * @returns 长细比 λ，无量纲
   */
  ['SLENDERNESS_RATIO', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const K = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    const r = num(args, 2, ctx);
    return isNaN(K) || isNaN(L) || isNaN(r) || r === 0 ? '#VALUE!' : K * L / r;
  }],

  /**
   * 钢筋混凝土单筋矩形截面受弯承载力（简化）
   * Mu = 0.87 fy As z
   * @param fy 钢筋屈服强度，单位 Pa
   * @param As 钢筋面积，单位 m²
   * @param z 内力臂，单位 m
   * @returns 受弯承载力 Mu，单位 N·m
   */
  ['MOMENT_CAPACITY_RC', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const fy = num(args, 0, ctx);
    const As = num(args, 1, ctx);
    const z = num(args, 2, ctx);
    return isNaN(fy) || isNaN(As) || isNaN(z) ? '#VALUE!' : 0.87 * fy * As * z;
  }],

  /**
   * 配筋率
   * ρ = As / (b · d)
   * @param As 钢筋面积，单位 m²
   * @param b 截面宽度，单位 m
   * @param d 截面有效高度，单位 m
   * @returns 配筋率 ρ，无量纲
   */
  ['REINFORCEMENT_RATIO', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const As = num(args, 0, ctx);
    const b = num(args, 1, ctx);
    const d = num(args, 2, ctx);
    return isNaN(As) || isNaN(b) || isNaN(d) || b === 0 || d === 0 ? '#VALUE!' : As / (b * d);
  }],

  /**
   * 混凝土抗剪承载力（简化）
   * Vc = 0.17 λ √(f'c) b d
   * @param fcc 混凝土抗压强度 f'c，单位 Pa
   * @param b 截面宽度，单位 m
   * @param d 有效高度，单位 m
   * @param lambda 轻骨料混凝土修正系数，默认 1.0
   * @returns 抗剪承载力 Vc，单位 N
   */
  ['SHEAR_STRENGTH_CONCRETE', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const fcc = num(args, 0, ctx);
    const b = num(args, 1, ctx);
    const d = num(args, 2, ctx);
    const lambda = args.length >= 4 ? num(args, 3, ctx) : 1;
    return isNaN(fcc) || isNaN(b) || isNaN(d) || isNaN(lambda) || fcc < 0 ? '#VALUE!' : 0.17 * lambda * Math.sqrt(fcc) * b * d;
  }],

  /**
   * 太沙基地基极限承载力（简化）
   * qu = c Nc + q Nq + 0.5 γ B Nγ
   * @param c 粘聚力，单位 Pa
   * @param q 超载，单位 Pa
   * @param gamma 土体重度，单位 N/m³
   * @param B 基础宽度，单位 m
   * @param Nc, Nq, Ngamma 承载力系数
   * @returns 极限承载力 qu，单位 Pa
   */
  ['BEARING_CAPACITY', (args, ctx) => {
    const err = assertCount(args, 6);
    if (err) return err;
    const c = num(args, 0, ctx);
    const q = num(args, 1, ctx);
    const gamma = num(args, 2, ctx);
    const B = num(args, 3, ctx);
    const Nc = num(args, 4, ctx);
    const Nq = num(args, 5, ctx);
    const Ngamma = num(args, 6, ctx);
    return isNaN(c) || isNaN(q) || isNaN(gamma) || isNaN(B) || isNaN(Nc) || isNaN(Nq) || isNaN(Ngamma) ? '#VALUE!' : c * Nc + q * Nq + 0.5 * gamma * B * Ngamma;
  }],

  /**
   * 朗肯主动土压力系数
   * Ka = tan²(45° - φ/2)
   * @param phi 土体内摩擦角，单位度
   * @returns 主动土压力系数 Ka
   */
  ['ACTIVE_EARTH_PRESSURE', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const phi = num(args, 0, ctx);
    return isNaN(phi) ? '#VALUE!' : Math.pow(Math.tan((Math.PI / 4) - (phi * Math.PI / 360)), 2);
  }],

  /**
   * 朗肯被动土压力系数
   * Kp = tan²(45° + φ/2)
   * @param phi 土体内摩擦角，单位度
   * @returns 被动土压力系数 Kp
   */
  ['PASSIVE_EARTH_PRESSURE', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const phi = num(args, 0, ctx);
    return isNaN(phi) ? '#VALUE!' : Math.pow(Math.tan((Math.PI / 4) + (phi * Math.PI / 360)), 2);
  }],

  /**
   * 水力半径
   * R = A / P
   * @param A 过水断面面积，单位 m²
   * @param P 湿周，单位 m
   * @returns 水力半径 R，单位 m
   */
  ['HYDRAULIC_RADIUS', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const A = num(args, 0, ctx);
    const P = num(args, 1, ctx);
    return isNaN(A) || isNaN(P) || P === 0 ? '#VALUE!' : A / P;
  }],

  /**
   * 曼宁公式流量
   * Q = (1/n) A R^(2/3) S^(1/2)
   * @param n 曼宁粗糙系数
   * @param A 过水断面面积，单位 m²
   * @param R 水力半径，单位 m
   * @param S 底坡，无量纲
   * @returns 流量 Q，单位 m³/s
   */
  ['MANNING_FLOW', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const n = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    const R = num(args, 2, ctx);
    const S = num(args, 3, ctx);
    return isNaN(n) || isNaN(A) || isNaN(R) || isNaN(S) || n === 0 || R < 0 || S < 0 ? '#VALUE!' : (1 / n) * A * Math.pow(R, 2 / 3) * Math.sqrt(S);
  }],

  /**
   * 达西-魏斯巴赫水头损失
   * hf = f (L/D) (V²/2g)
   * @param f 沿程阻力系数
   * @param L 管长，单位 m
   * @param D 管径，单位 m
   * @param V 流速，单位 m/s
   * @param g 重力加速度，默认 9.80665 m/s²
   * @returns 水头损失 hf，单位 m
   */
  ['DARCY_WEISBACH', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const f = num(args, 0, ctx);
    const L = num(args, 1, ctx);
    const D = num(args, 2, ctx);
    const V = num(args, 3, ctx);
    const g = args.length >= 5 ? num(args, 4, ctx) : 9.80665;
    return isNaN(f) || isNaN(L) || isNaN(D) || isNaN(V) || isNaN(g) || D === 0 || g === 0 ? '#VALUE!' : f * (L / D) * (V * V / (2 * g));
  }],

  /**
   * 雷诺数
   * Re = ρ V D / μ
   * @param rho 流体密度，单位 kg/m³
   * @param V 流速，单位 m/s
   * @param D 特征长度，单位 m
   * @param mu 动力粘度，单位 Pa·s
   * @returns 雷诺数 Re，无量纲
   */
  ['REYNOLDS_NUMBER', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const rho = num(args, 0, ctx);
    const V = num(args, 1, ctx);
    const D = num(args, 2, ctx);
    const mu = num(args, 3, ctx);
    return isNaN(rho) || isNaN(V) || isNaN(D) || isNaN(mu) || mu === 0 ? '#VALUE!' : rho * V * D / mu;
  }],

  /**
   * 弗劳德数
   * Fr = V / √(g D)
   * @param V 流速，单位 m/s
   * @param D 特征水深，单位 m
   * @param g 重力加速度，默认 9.80665 m/s²
   * @returns 弗劳德数 Fr，无量纲
   */
  ['FROUDE_NUMBER', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const V = num(args, 0, ctx);
    const D = num(args, 1, ctx);
    const g = args.length >= 3 ? num(args, 2, ctx) : 9.80665;
    return isNaN(V) || isNaN(D) || isNaN(g) || D <= 0 || g <= 0 ? '#VALUE!' : V / Math.sqrt(g * D);
  }],

  /**
   * 矩形薄壁堰流量（简化）
   * Q = 1.84 B H^(3/2)
   * @param B 堰宽，单位 m
   * @param H 堰上水头，单位 m
   * @returns 流量 Q，单位 m³/s
   */
  ['WEIR_FLOW', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const B = num(args, 0, ctx);
    const H = num(args, 1, ctx);
    return isNaN(B) || isNaN(H) || H < 0 ? '#VALUE!' : 1.84 * B * Math.pow(H, 1.5);
  }],

  /**
   * 地基沉降（弹性理论简化）
   * S = q B (1 - ν²) / E
   * @param q 基底压力，单位 Pa
   * @param B 基础宽度，单位 m
   * @param E 土体弹性模量，单位 Pa
   * @param nu 泊松比
   * @returns 沉降 S，单位 m
   */
  ['SETTLEMENT', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const q = num(args, 0, ctx);
    const B = num(args, 1, ctx);
    const E = num(args, 2, ctx);
    const nu = num(args, 3, ctx);
    return isNaN(q) || isNaN(B) || isNaN(E) || isNaN(nu) || E === 0 ? '#VALUE!' : q * B * (1 - nu * nu) / E;
  }],

  /**
   * 基本风压
   * w = 0.5 ρ v²
   * @param v 风速，单位 m/s
   * @param rho 空气密度，默认 1.225 kg/m³
   * @returns 风压 w，单位 Pa
   */
  ['WIND_PRESSURE', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const v = num(args, 0, ctx);
    const rho = args.length >= 2 ? num(args, 1, ctx) : 1.225;
    return isNaN(v) || isNaN(rho) ? '#VALUE!' : 0.5 * rho * v * v;
  }],

  /**
   * 地震底部剪力（简化基底剪力法）
   * V = Cs · W
   * @param Cs 地震反应系数
   * @param W 结构总重量，单位 N
   * @returns 底部剪力 V，单位 N
   */
  ['SEISMIC_BASE_SHEAR', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const Cs = num(args, 0, ctx);
    const W = num(args, 1, ctx);
    return isNaN(Cs) || isNaN(W) ? '#VALUE!' : Cs * W;
  }],
];

// ==================== 材料工程与热力学/流体力学公式（30个）====================

const materialThermalFluidFormulas: Array<[string, FormulaHandler]> = [
  /**
   * 密度
   * ρ = m / V
   * @param m 质量，单位 kg
   * @param V 体积，单位 m³
   * @returns 密度 ρ，单位 kg/m³
   */
  ['DENSITY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const m = num(args, 0, ctx);
    const V = num(args, 1, ctx);
    return isNaN(m) || isNaN(V) || V === 0 ? '#VALUE!' : m / V;
  }],

  /**
   * 重度（比重）
   * γ = ρ · g
   * @param rho 密度，单位 kg/m³
   * @param g 重力加速度，默认 9.80665 m/s²
   * @returns 重度 γ，单位 N/m³
   */
  ['SPECIFIC_WEIGHT', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const rho = num(args, 0, ctx);
    const g = args.length >= 2 ? num(args, 1, ctx) : 9.80665;
    return isNaN(rho) || isNaN(g) ? '#VALUE!' : rho * g;
  }],

  /**
   * 相对密度
   * SG = ρ / ρ_ref
   * @param rho 物质密度，单位 kg/m³
   * @param rhoRef 参考密度（水=1000），单位 kg/m³
   * @returns 相对密度 SG，无量纲
   */
  ['SPECIFIC_GRAVITY', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const rho = num(args, 0, ctx);
    const rhoRef = args.length >= 2 ? num(args, 1, ctx) : 1000;
    return isNaN(rho) || isNaN(rhoRef) || rhoRef === 0 ? '#VALUE!' : rho / rhoRef;
  }],

  /**
   * 线热膨胀
   * ΔL = α · L0 · ΔT
   * @param alpha 线膨胀系数，单位 1/°C
   * @param L0 原长，单位 m
   * @param dT 温度变化，单位 °C
   * @returns 长度变化 ΔL，单位 m
   */
  ['THERMAL_EXPANSION', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const alpha = num(args, 0, ctx);
    const L0 = num(args, 1, ctx);
    const dT = num(args, 2, ctx);
    return isNaN(alpha) || isNaN(L0) || isNaN(dT) ? '#VALUE!' : alpha * L0 * dT;
  }],

  /**
   * 热量计算
   * Q = m · c · ΔT
   * @param m 质量，单位 kg
   * @param c 比热容，单位 J/(kg·°C)
   * @param dT 温度变化，单位 °C
   * @returns 热量 Q，单位 J
   */
  ['HEAT_CAPACITY', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const m = num(args, 0, ctx);
    const c = num(args, 1, ctx);
    const dT = num(args, 2, ctx);
    return isNaN(m) || isNaN(c) || isNaN(dT) ? '#VALUE!' : m * c * dT;
  }],

  /**
   * 导热热流密度（傅里叶定律）
   * q = k · ΔT / d
   * @param k 导热系数，单位 W/(m·K)
   * @param dT 温差，单位 K
   * @param d 厚度，单位 m
   * @returns 热流密度 q，单位 W/m²
   */
  ['HEAT_TRANSFER_CONDUCT', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const k = num(args, 0, ctx);
    const dT = num(args, 1, ctx);
    const d = num(args, 2, ctx);
    return isNaN(k) || isNaN(dT) || isNaN(d) || d === 0 ? '#VALUE!' : k * dT / d;
  }],

  /**
   * 对流换热
   * Q = h · A · ΔT
   * @param h 对流换热系数，单位 W/(m²·K)
   * @param A 面积，单位 m²
   * @param dT 温差，单位 K
   * @returns 换热量 Q，单位 W
   */
  ['HEAT_TRANSFER_CONVECT', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const h = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    const dT = num(args, 2, ctx);
    return isNaN(h) || isNaN(A) || isNaN(dT) ? '#VALUE!' : h * A * dT;
  }],

  /**
   * 辐射换热量（斯蒂芬-玻尔兹曼定律）
   * Q = ε σ A (T1⁴ - T2⁴)
   * @param epsilon 发射率，无量纲
   * @param A 面积，单位 m²
   * @param T1 高温表面温度，单位 K
   * @param T2 低温表面温度，单位 K
   * @returns 辐射换热量 Q，单位 W
   */
  ['HEAT_TRANSFER_RADIATION', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const epsilon = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    const T1 = num(args, 2, ctx);
    const T2 = num(args, 3, ctx);
    const sigma = 5.670374419e-8;
    return isNaN(epsilon) || isNaN(A) || isNaN(T1) || isNaN(T2) ? '#VALUE!' : epsilon * sigma * A * (Math.pow(T1, 4) - Math.pow(T2, 4));
  }],

  /**
   * 理想气体状态方程求压力
   * P = n R T / V
   * @param n 物质的量，单位 mol
   * @param T 温度，单位 K
   * @param V 体积，单位 m³
   * @param R 通用气体常数，默认 8.314 J/(mol·K)
   * @returns 压力 P，单位 Pa
   */
  ['IDEAL_GAS_PRESSURE', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const n = num(args, 0, ctx);
    const T = num(args, 1, ctx);
    const V = num(args, 2, ctx);
    const R = args.length >= 4 ? num(args, 3, ctx) : 8.314;
    return isNaN(n) || isNaN(T) || isNaN(V) || isNaN(R) || V === 0 ? '#VALUE!' : n * R * T / V;
  }],

  /**
   * 玻意耳定律（等温过程）
   * P1 V1 = P2 V2
   * @param P1 初始压力，单位 Pa
   * @param V1 初始体积，单位 m³
   * @param P2 最终压力，单位 Pa
   * @returns 最终体积 V2，单位 m³
   */
  ['BOYLES_LAW', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const P1 = num(args, 0, ctx);
    const V1 = num(args, 1, ctx);
    const P2 = num(args, 2, ctx);
    return isNaN(P1) || isNaN(V1) || isNaN(P2) || P2 === 0 ? '#VALUE!' : P1 * V1 / P2;
  }],

  /**
   * 查理定律（等压过程）
   * V1 / T1 = V2 / T2
   * @param V1 初始体积，单位 m³
   * @param T1 初始温度，单位 K
   * @param T2 最终温度，单位 K
   * @returns 最终体积 V2，单位 m³
   */
  ['CHARLES_LAW', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const V1 = num(args, 0, ctx);
    const T1 = num(args, 1, ctx);
    const T2 = num(args, 2, ctx);
    return isNaN(V1) || isNaN(T1) || isNaN(T2) || T1 === 0 ? '#VALUE!' : V1 * T2 / T1;
  }],

  /**
   * 盖-吕萨克定律（等容过程）
   * P1 / T1 = P2 / T2
   * @param P1 初始压力，单位 Pa
   * @param T1 初始温度，单位 K
   * @param T2 最终温度，单位 K
   * @returns 最终压力 P2，单位 Pa
   */
  ['GAY_LUSSAC_LAW', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const P1 = num(args, 0, ctx);
    const T1 = num(args, 1, ctx);
    const T2 = num(args, 2, ctx);
    return isNaN(P1) || isNaN(T1) || isNaN(T2) || T1 === 0 ? '#VALUE!' : P1 * T2 / T1;
  }],

  /**
   * 卡诺热机效率
   * η = 1 - Tc / Th
   * @param Tc 低温热源温度，单位 K
   * @param Th 高温热源温度，单位 K
   * @returns 效率 η，无量纲
   */
  ['CARNOT_EFFICIENCY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const Tc = num(args, 0, ctx);
    const Th = num(args, 1, ctx);
    return isNaN(Tc) || isNaN(Th) || Th === 0 ? '#VALUE!' : 1 - Tc / Th;
  }],

  /**
   * 等压熵变（理想气体）
   * ΔS = n Cp ln(T2/T1)
   * @param n 物质的量，单位 mol
   * @param Cp 定压热容，单位 J/(mol·K)
   * @param T1 初始温度，单位 K
   * @param T2 最终温度，单位 K
   * @returns 熵变 ΔS，单位 J/K
   */
  ['ENTROPY_CHANGE', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const n = num(args, 0, ctx);
    const Cp = num(args, 1, ctx);
    const T1 = num(args, 2, ctx);
    const T2 = num(args, 3, ctx);
    return isNaN(n) || isNaN(Cp) || isNaN(T1) || isNaN(T2) || T1 <= 0 || T2 <= 0 ? '#VALUE!' : n * Cp * Math.log(T2 / T1);
  }],

  /**
   * 动力粘度（牛顿流体剪切）
   * μ = τ / (dv/dy)
   * @param tau 剪切应力，单位 Pa
   * @param dvdy 速度梯度，单位 (m/s)/m
   * @returns 动力粘度 μ，单位 Pa·s
   */
  ['DYNAMIC_VISCOSITY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const tau = num(args, 0, ctx);
    const dvdy = num(args, 1, ctx);
    return isNaN(tau) || isNaN(dvdy) || dvdy === 0 ? '#VALUE!' : tau / dvdy;
  }],

  /**
   * 运动粘度
   * ν = μ / ρ
   * @param mu 动力粘度，单位 Pa·s
   * @param rho 密度，单位 kg/m³
   * @returns 运动粘度 ν，单位 m²/s
   */
  ['KINEMATIC_VISCOSITY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const mu = num(args, 0, ctx);
    const rho = num(args, 1, ctx);
    return isNaN(mu) || isNaN(rho) || rho === 0 ? '#VALUE!' : mu / rho;
  }],

  /**
   * 伯努利方程压力形式（忽略高度差）
   * P2 = P1 + 0.5 ρ (V1² - V2²)
   * @param P1 初始压力，单位 Pa
   * @param V1 初始流速，单位 m/s
   * @param V2 最终流速，单位 m/s
   * @param rho 密度，单位 kg/m³
   * @returns 最终压力 P2，单位 Pa
   */
  ['BERNOULLI_PRESSURE', (args, ctx) => {
    const err = assertCount(args, 4);
    if (err) return err;
    const P1 = num(args, 0, ctx);
    const V1 = num(args, 1, ctx);
    const V2 = num(args, 2, ctx);
    const rho = num(args, 3, ctx);
    return isNaN(P1) || isNaN(V1) || isNaN(V2) || isNaN(rho) ? '#VALUE!' : P1 + 0.5 * rho * (V1 * V1 - V2 * V2);
  }],

  /**
   * 管道平均流速
   * V = Q / A
   * @param Q 体积流量，单位 m³/s
   * @param A 截面积，单位 m²
   * @returns 流速 V，单位 m/s
   */
  ['FLOW_VELOCITY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const Q = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    return isNaN(Q) || isNaN(A) || A === 0 ? '#VALUE!' : Q / A;
  }],

  /**
   * 质量流量
   * ṁ = ρ · A · V
   * @param rho 密度，单位 kg/m³
   * @param A 截面积，单位 m²
   * @param V 流速，单位 m/s
   * @returns 质量流量，单位 kg/s
   */
  ['MASS_FLOW_RATE', (args, ctx) => {
    const err = assertCount(args, 3);
    if (err) return err;
    const rho = num(args, 0, ctx);
    const A = num(args, 1, ctx);
    const V = num(args, 2, ctx);
    return isNaN(rho) || isNaN(A) || isNaN(V) ? '#VALUE!' : rho * A * V;
  }],

  /**
   * 体积流量
   * Q = A · V
   * @param A 截面积，单位 m²
   * @param V 流速，单位 m/s
   * @returns 体积流量 Q，单位 m³/s
   */
  ['VOLUMETRIC_FLOW_RATE', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const A = num(args, 0, ctx);
    const V = num(args, 1, ctx);
    return isNaN(A) || isNaN(V) ? '#VALUE!' : A * V;
  }],

  /**
   * 截面惯性矩（矩形）
   * I = b h³ / 12
   * @param b 宽度，单位 m
   * @param h 高度，单位 m
   * @returns 惯性矩 I，单位 m⁴
   */
  ['MOMENT_OF_INERTIA_RECT', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const b = num(args, 0, ctx);
    const h = num(args, 1, ctx);
    return isNaN(b) || isNaN(h) ? '#VALUE!' : b * Math.pow(h, 3) / 12;
  }],

  /**
   * 截面惯性矩（圆形）
   * I = π d⁴ / 64
   * @param d 直径，单位 m
   * @returns 惯性矩 I，单位 m⁴
   */
  ['MOMENT_OF_INERTIA_CIRCLE', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const d = num(args, 0, ctx);
    return isNaN(d) ? '#VALUE!' : Math.PI * Math.pow(d, 4) / 64;
  }],

  /**
   * 圆管截面积
   * A = π d² / 4
   * @param d 直径，单位 m
   * @returns 面积 A，单位 m²
   */
  ['PIPE_AREA', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const d = num(args, 0, ctx);
    return isNaN(d) ? '#VALUE!' : Math.PI * d * d / 4;
  }],

  /**
   * 布氏硬度估算抗拉强度（钢，近似）
   * UTS ≈ 3.45 HB
   * @param HB 布氏硬度值
   * @returns 抗拉强度 UTS，单位 MPa
   */
  ['BRINELL_TO_UTS', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const HB = num(args, 0, ctx);
    return isNaN(HB) ? '#VALUE!' : 3.45 * HB;
  }],

  /**
   * 洛氏 C 硬度估算抗拉强度（近似）
   * UTS ≈ -99.8 + 11.48 HRC
   * @param HRC 洛氏 C 硬度
   * @returns 抗拉强度 UTS，单位 ksi
   */
  ['ROCKWELL_TO_UTS', (args, ctx) => {
    const err = assertCount(args, 1);
    if (err) return err;
    const HRC = num(args, 0, ctx);
    return isNaN(HRC) ? '#VALUE!' : -99.8 + 11.48 * HRC;
  }],

  /**
   * 应力强度因子（简化中心裂纹）
   * KI = σ √(π a)
   * @param sigma 远场应力，单位 Pa
   * @param a 裂纹半长，单位 m
   * @returns 应力强度因子 KI，单位 Pa·√m
   */
  ['STRESS_INTENSITY', (args, ctx) => {
    const err = assertCount(args, 2);
    if (err) return err;
    const sigma = num(args, 0, ctx);
    const a = num(args, 1, ctx);
    return isNaN(sigma) || isNaN(a) || a < 0 ? '#VALUE!' : sigma * Math.sqrt(Math.PI * a);
  }],
];

export const engineeringFormulas = new Map<string, FormulaHandler>([
  ...mechanicalFormulas,
  ...electricalFormulas,
  ...civilFormulas,
  ...materialThermalFluidFormulas,
]);

