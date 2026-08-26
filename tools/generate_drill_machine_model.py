from __future__ import annotations

import math
import base64
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs"
OBJ_PATH = OUTPUT / "drill-machine-reference-model.obj"
MTL_PATH = OUTPUT / "drill-machine-reference-model.mtl"
MODEL_JS_PATH = OUTPUT / "drill-machine-reference-model.js"


MATERIALS = {
    "machine_green": ((0.20, 0.28, 0.24), 1.0, 28),
    "machine_green_light": ((0.31, 0.40, 0.34), 1.0, 34),
    "machine_green_dark": ((0.11, 0.17, 0.15), 1.0, 22),
    "steel": ((0.61, 0.67, 0.68), 1.0, 80),
    "steel_light": ((0.82, 0.87, 0.87), 1.0, 96),
    "steel_dark": ((0.27, 0.32, 0.33), 1.0, 46),
    "cast_iron": ((0.18, 0.22, 0.21), 1.0, 20),
    "black": ((0.035, 0.045, 0.045), 1.0, 18),
    "red_knob": ((0.88, 0.08, 0.09), 1.0, 64),
    "scale_white": ((0.86, 0.87, 0.82), 1.0, 42),
    "scale_black": ((0.05, 0.05, 0.045), 1.0, 22),
    "brass": ((0.55, 0.42, 0.18), 1.0, 62),
    "ball": ((0.035, 0.33, 0.48), 0.72, 78),
    "layout_red": ((1.0, 0.10, 0.12), 1.0, 64),
}


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def length(a):
    return math.sqrt(dot(a, a))


def norm(a):
    size = length(a)
    return (0.0, 1.0, 0.0) if size < 1e-9 else mul(a, 1.0 / size)


def lerp(a, b, t):
    return add(mul(a, 1 - t), mul(b, t))


class Mesh:
    def __init__(self):
        self.vertices: list[tuple[float, float, float]] = []
        self.parts: list[dict] = []

    def part(self, name: str, material: str, vertices, faces):
        offset = len(self.vertices)
        self.vertices.extend(vertices)
        self.parts.append(
            {
                "name": name,
                "material": material,
                "faces": [[offset + index + 1 for index in face] for face in faces],
            }
        )

    def box(self, name, center, size, material):
        x, y, z = center
        sx, sy, sz = (value / 2 for value in size)
        vertices = [
            (x - sx, y - sy, z - sz),
            (x + sx, y - sy, z - sz),
            (x + sx, y + sy, z - sz),
            (x - sx, y + sy, z - sz),
            (x - sx, y - sy, z + sz),
            (x + sx, y - sy, z + sz),
            (x + sx, y + sy, z + sz),
            (x - sx, y + sy, z + sz),
        ]
        faces = [
            [0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4],
            [3, 7, 6, 2], [1, 2, 6, 5], [0, 4, 7, 3],
        ]
        self.part(name, material, vertices, faces)

    def frustum_box(self, name, bottom_center, bottom_size, top_size, height, material):
        x, y, z = bottom_center
        bw, bd = bottom_size
        tw, td = top_size
        vertices = [
            (x - bw / 2, y, z - bd / 2), (x + bw / 2, y, z - bd / 2),
            (x + bw / 2, y, z + bd / 2), (x - bw / 2, y, z + bd / 2),
            (x - tw / 2, y + height, z - td / 2), (x + tw / 2, y + height, z - td / 2),
            (x + tw / 2, y + height, z + td / 2), (x - tw / 2, y + height, z + td / 2),
        ]
        faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
        self.part(name, material, vertices, faces)

    def cylinder(self, name, p1, p2, radius, material, segments=20, cap=True):
        axis = norm(sub(p2, p1))
        helper = (0.0, 1.0, 0.0) if abs(axis[1]) < 0.88 else (1.0, 0.0, 0.0)
        side = norm(cross(axis, helper))
        up = norm(cross(side, axis))
        ring1, ring2 = [], []
        for i in range(segments):
            angle = i / segments * math.tau
            radial = add(mul(side, math.cos(angle) * radius), mul(up, math.sin(angle) * radius))
            ring1.append(add(p1, radial))
            ring2.append(add(p2, radial))
        vertices = ring1 + ring2
        faces = []
        for i in range(segments):
            nxt = (i + 1) % segments
            faces.append([i, nxt, segments + nxt, segments + i])
        if cap:
            faces.append(list(reversed(range(segments))))
            faces.append(list(range(segments, segments * 2)))
        self.part(name, material, vertices, faces)

    def cone(self, name, base_center, tip, radius, material, segments=20):
        axis = norm(sub(tip, base_center))
        helper = (0.0, 1.0, 0.0) if abs(axis[1]) < 0.88 else (1.0, 0.0, 0.0)
        side = norm(cross(axis, helper))
        up = norm(cross(side, axis))
        vertices = []
        for i in range(segments):
            angle = i / segments * math.tau
            vertices.append(add(base_center, add(mul(side, math.cos(angle) * radius), mul(up, math.sin(angle) * radius))))
        vertices.append(tip)
        faces = [list(reversed(range(segments)))]
        for i in range(segments):
            faces.append([i, (i + 1) % segments, segments])
        self.part(name, material, vertices, faces)

    def sphere(self, name, center, radius, material, rings=18, segments=36):
        vertices = []
        for r in range(rings + 1):
            phi = r / rings * math.pi
            y = math.cos(phi) * radius
            radial = math.sin(phi) * radius
            for i in range(segments):
                theta = i / segments * math.tau
                vertices.append((center[0] + math.cos(theta) * radial, center[1] + y, center[2] + math.sin(theta) * radial))
        faces = []
        for r in range(rings):
            for i in range(segments):
                nxt = (i + 1) % segments
                a = r * segments + i
                b = r * segments + nxt
                c = (r + 1) * segments + nxt
                d = (r + 1) * segments + i
                faces.append([a, b, c, d])
        self.part(name, material, vertices, faces)

    def torus(self, name, center, major_radius, minor_radius, material, plane="xz", start=0.0, end=math.tau, major_segments=64, minor_segments=10):
        vertices = []
        full = abs((end - start) - math.tau) < 1e-6
        major_count = major_segments if full else major_segments + 1
        for i in range(major_count):
            u = start + (end - start) * (i / major_segments)
            for j in range(minor_segments):
                v = j / minor_segments * math.tau
                major = major_radius + minor_radius * math.cos(v)
                tube = minor_radius * math.sin(v)
                if plane == "xz":
                    point = (center[0] + math.cos(u) * major, center[1] + tube, center[2] + math.sin(u) * major)
                elif plane == "yz":
                    point = (center[0] + tube, center[1] + math.cos(u) * major, center[2] + math.sin(u) * major)
                else:
                    point = (center[0] + math.cos(u) * major, center[1] + math.sin(u) * major, center[2] + tube)
                vertices.append(point)
        faces = []
        major_faces = major_segments if full else major_segments
        for i in range(major_faces):
            ni = (i + 1) % major_count
            for j in range(minor_segments):
                nj = (j + 1) % minor_segments
                faces.append([i * minor_segments + j, ni * minor_segments + j, ni * minor_segments + nj, i * minor_segments + nj])
        self.part(name, material, vertices, faces)

    def tube(self, name, points, radius, material, segments=12):
        for index in range(len(points) - 1):
            self.cylinder(f"{name}_{index:02d}", points[index], points[index + 1], radius, material, segments)
        for index, point in enumerate(points[1:-1], start=1):
            self.sphere(f"{name}_joint_{index:02d}", point, radius * 1.01, material, rings=6, segments=12)

    def write(self):
        lines = [f"mtllib {MTL_PATH.name}", "# Simplified Hinetani-style bowling drill machine reference model", "# Units: millimeters"]
        for vertex in self.vertices:
            lines.append(f"v {vertex[0]:.5f} {vertex[1]:.5f} {vertex[2]:.5f}")
        for part in self.parts:
            lines.append(f"o {part['name']}")
            lines.append(f"usemtl {part['material']}")
            for face in part["faces"]:
                lines.append("f " + " ".join(str(value) for value in face))
        OBJ_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
        encoded_obj = base64.b64encode(OBJ_PATH.read_bytes()).decode("ascii")
        MODEL_JS_PATH.write_text(
            'window.__DRILL_MACHINE_OBJ_BASE64__="' + encoded_obj + '";\n',
            encoding="ascii",
        )

        mtl = ["# Drill machine material library"]
        for name, (color, opacity, shininess) in MATERIALS.items():
            mtl.extend(
                [
                    f"newmtl {name}",
                    f"Ka {color[0] * .28:.4f} {color[1] * .28:.4f} {color[2] * .28:.4f}",
                    f"Kd {color[0]:.4f} {color[1]:.4f} {color[2]:.4f}",
                    f"Ks 0.34 0.34 0.34",
                    f"Ns {shininess}",
                    f"d {opacity:.3f}",
                    "illum 2",
                    "",
                ]
            )
        MTL_PATH.write_text("\n".join(mtl), encoding="utf-8")


def add_ticks(mesh: Mesh, center, axis, radial_axis, radius, count, name_prefix, material="scale_black"):
    axis = norm(axis)
    radial_axis = norm(radial_axis)
    tangent_axis = norm(cross(axis, radial_axis))
    for i in range(count):
        angle = (i - (count - 1) / 2) * math.radians(4)
        radial = add(mul(radial_axis, math.cos(angle)), mul(tangent_axis, math.sin(angle)))
        outer = add(center, mul(radial, radius))
        inner = add(center, mul(radial, radius - (10 if i % 4 == 0 else 6)))
        mesh.cylinder(f"{name_prefix}_tick_{i:02d}", inner, outer, 1.2, material, 8)


def add_graduated_ring(mesh: Mesh, name, center, axis, radial_axis, radius, width, plane):
    """Build the large engraved collars visible on the two orthogonal fixture axes."""
    axis = norm(axis)
    radial_axis = norm(radial_axis)
    tangent_axis = norm(cross(axis, radial_axis))
    face = add(center, mul(axis, width / 2 + 1.5))
    mesh.cylinder(f"{name}_cast_body", add(center, mul(axis, -width / 2)), add(center, mul(axis, width / 2)), radius - 8, "machine_green_dark", 48)
    mesh.torus(f"{name}_steel_rim", center, radius - 3.5, 6.5, "steel_light", plane, major_segments=72, minor_segments=10)
    mesh.cylinder(f"{name}_hub", add(center, mul(axis, -width / 2 - 6)), add(center, mul(axis, width / 2 + 10)), 27, "steel_dark", 28)
    for i in range(61):
        angle = math.radians(-75 + i * 2.5)
        radial = add(mul(radial_axis, math.cos(angle)), mul(tangent_axis, math.sin(angle)))
        tick_length = 15 if i % 10 == 0 else 10 if i % 5 == 0 else 6
        outer = add(face, mul(radial, radius + 1))
        inner = add(face, mul(radial, radius + 1 - tick_length))
        mesh.cylinder(f"{name}_graduation_{i:02d}", inner, outer, 1.15 if i % 5 else 1.65, "scale_black", 8)
    # Fixed zero pointer at the top of each scale.
    pointer_root = add(face, mul(radial_axis, radius + 10))
    pointer_tip = add(face, mul(radial_axis, radius - 7))
    mesh.cylinder(f"{name}_zero_pointer", pointer_root, pointer_tip, 2.8, "layout_red", 10)


def add_spoked_handle(mesh: Mesh, name, center, axis, radial_a, radial_b, spoke_radius=79, spoke_count=3):
    axis = norm(axis)
    radial_a, radial_b = norm(radial_a), norm(radial_b)
    outer_face = add(center, mul(axis, 23))
    mesh.cylinder(f"{name}_boss", add(center, mul(axis, 12)), add(center, mul(axis, 31)), 24, "machine_green", 24)
    for i in range(spoke_count):
        a = math.radians(-25 + i * 360 / spoke_count)
        direction = add(mul(radial_a, math.cos(a)), mul(radial_b, math.sin(a)))
        start = add(outer_face, mul(direction, 20))
        end = add(outer_face, mul(direction, spoke_radius))
        mesh.cylinder(f"{name}_spoke_{i}", start, end, 6.2, "steel", 12)
        mesh.sphere(f"{name}_knob_{i}", end, 16.5, "red_knob", 9, 16)


def build_model():
    mesh = Mesh()

    # Pedestal and machine body.
    mesh.frustum_box("cabinet", (0, 20, -55), (520, 610), (445, 505), 620, "machine_green")
    mesh.box("cabinet_top", (0, 655, -55), (475, 70, 545), "machine_green_dark")
    mesh.box("cabinet_front_panel", (0, 370, 252), (355, 260, 10), "machine_green_light")
    mesh.box("cabinet_nameplate", (0, 360, 259), (242, 62, 5), "machine_green_dark")
    for x in (-95, -55, -15, 25, 65, 105):
        mesh.box(f"cabinet_logo_mark_{x}", (x, 360, 263), (18, 8, 3), "brass")
    for x in (-112, 112):
        mesh.box(f"cabinet_top_slot_{x}", (x, 693, 42), (16, 4, 175), "black")
    for x in (-190, 190):
        for z in (-250, 200):
            mesh.cylinder(f"foot_{x}_{z}", (x, 0, z), (x, 22, z), 24, "cast_iron", 16)

    # Column, ways and head slide.
    mesh.box("column", (-62, 1085, -188), (205, 850, 195), "machine_green_dark")
    mesh.box("column_front_way_left", (-122, 1080, -82), (30, 770, 24), "steel_dark")
    mesh.box("column_front_way_right", (-2, 1080, -82), (30, 770, 24), "steel_dark")
    mesh.box("head_slide", (-58, 1310, -55), (260, 310, 118), "machine_green")

    # Drill head and motor.
    mesh.box("head_body", (15, 1480, -102), (285, 245, 245), "machine_green_light")
    mesh.box("head_front", (45, 1385, 8), (195, 250, 115), "machine_green")
    mesh.cylinder("motor_lower", (-48, 1588, -142), (-48, 1710, -142), 104, "machine_green_light", 32)
    mesh.cylinder("motor_cap_rim", (-48, 1700, -142), (-48, 1740, -142), 113, "machine_green_light", 32)
    mesh.cylinder("motor_cap_upper", (-48, 1740, -142), (-48, 1780, -142), 97, "machine_green_light", 32)
    mesh.cylinder("motor_cap_top", (-48, 1780, -142), (-48, 1795, -142), 76, "machine_green_light", 28)
    mesh.box("control_box", (-207, 1495, 8), (120, 210, 104), "machine_green_light")
    mesh.box("switch_red", (-235, 1522, 65), (40, 46, 10), "red_knob")
    mesh.box("switch_black", (-179, 1522, 65), (40, 46, 10), "black")
    mesh.box("speed_plate", (45, 1470, 70), (126, 188, 7), "machine_green_dark")
    for y in range(1400, 1545, 24):
        mesh.box(f"speed_plate_line_{y}", (45, y, 75), (82, 2.5, 2), "scale_white")

    # Spindle, chuck and drill bit.
    spindle_x, spindle_z = 45, 10
    mesh.cylinder("quill_outer", (spindle_x, 1280, spindle_z), (spindle_x, 1450, spindle_z), 39, "steel_dark", 24)
    mesh.cylinder("spindle", (spindle_x, 1228, spindle_z), (spindle_x, 1390, spindle_z), 22, "steel_light", 24)
    mesh.cylinder("chuck_upper", (spindle_x, 1210, spindle_z), (spindle_x, 1250, spindle_z), 35, "steel_dark", 20)
    mesh.cone("chuck_lower", (spindle_x, 1212, spindle_z), (spindle_x, 1178, spindle_z), 35, "steel_dark", 20)
    mesh.cylinder("drill_bit", (spindle_x, 1164, spindle_z), (spindle_x, 1180, spindle_z), 9, "steel_light", 18)
    mesh.cone("drill_point", (spindle_x, 1164, spindle_z), (spindle_x, 1157, spindle_z), 9, "steel_light", 18)

    # Feed hub and three feed handles.
    feed_hub = (174, 1420, 22)
    mesh.cylinder("feed_hub", (feed_hub[0], feed_hub[1], -5), (feed_hub[0], feed_hub[1], 65), 36, "steel_dark", 20)
    for i, angle in enumerate((25, 145, 265)):
        radians = math.radians(angle)
        end = (feed_hub[0] + math.cos(radians) * 150, feed_hub[1] + math.sin(radians) * 150, 65)
        mesh.cylinder(f"feed_spoke_{i}", (feed_hub[0], feed_hub[1], 62), end, 8, "steel", 12)
        mesh.sphere(f"feed_knob_{i}", end, 24, "red_knob", 8, 16)

    # Bit rack arm and carousel.
    mesh.cylinder("bit_rack_arm", (165, 1290, -82), (500, 1290, -82), 18, "machine_green_dark", 16)
    mesh.torus("bit_rack_ring", (515, 1370, -35), 122, 11, "scale_white", "xz", major_segments=42, minor_segments=8)
    for i in range(20):
        angle = i / 20 * math.tau
        radius = 118
        x = 515 + math.cos(angle) * radius
        z = -35 + math.sin(angle) * radius
        bit_radius = 6 + (i % 5) * 1.2
        mesh.cylinder(f"rack_bit_{i:02d}", (x, 1190, z), (x, 1360, z), bit_radius, "steel_dark", 12)
        mesh.cone(f"rack_bit_point_{i:02d}", (x, 1190, z), (x, 1165, z), bit_radius, "steel_dark", 12)

    # Cross-slide table, dovetail ways, T-slots and linear verniers.
    mesh.box("lower_slide", (45, 735, 10), (610, 66, 535), "machine_green_dark")
    mesh.box("lower_slide_front_lip", (45, 750, 282), (630, 44, 24), "cast_iron")
    mesh.box("lower_way_left", (-145, 772, 10), (78, 34, 490), "steel_dark")
    mesh.box("lower_way_right", (235, 772, 10), (78, 34, 490), "steel_dark")
    mesh.box("lower_dovetail_left", (-145, 794, 10), (112, 18, 472), "machine_green_light")
    mesh.box("lower_dovetail_right", (235, 794, 10), (112, 18, 472), "machine_green_light")
    mesh.box("upper_slide", (45, 825, 10), (525, 96, 455), "machine_green")
    mesh.box("upper_slide_cap", (45, 877, 10), (500, 18, 430), "cast_iron")
    for x in (-112, 202):
        mesh.box(f"table_t_slot_{x}", (x, 890, 10), (19, 8, 370), "black")
        mesh.box(f"table_t_slot_lip_left_{x}", (x - 11, 894, 10), (5, 5, 370), "steel_dark")
        mesh.box(f"table_t_slot_lip_right_{x}", (x + 11, 894, 10), (5, 5, 370), "steel_dark")
    mesh.box("upper_scale_front", (45, 846, 244), (382, 35, 11), "scale_white")
    for i in range(33):
        x = -139 + i * 11.5
        height = 27 if i % 8 == 0 else 21 if i % 4 == 0 else 13
        mesh.box(f"front_scale_tick_{i:02d}", (x, 846, 251), (2.0, height, 4), "scale_black")
    mesh.box("upper_scale_side", (314, 846, 10), (10, 35, 286), "scale_white")
    for i in range(25):
        z = -128 + i * 11
        width = 27 if i % 8 == 0 else 20 if i % 4 == 0 else 13
        mesh.box(f"side_linear_tick_{i:02d}", (321, 846, z), (4, width, 2), "scale_black")

    # Horizontal hand wheels for planar positioning.
    mesh.cylinder("x_feed_shaft", (320, 790, 120), (445, 790, 120), 12, "steel", 14)
    mesh.torus("x_feed_wheel", (462, 790, 120), 58, 8, "steel_dark", "yz", major_segments=36, minor_segments=8)
    mesh.cylinder("x_feed_handle", (462, 790, 178), (505, 790, 205), 7, "steel", 10)
    mesh.sphere("x_feed_knob", (505, 790, 205), 18, "red_knob", 8, 14)
    mesh.cylinder("z_feed_shaft", (-230, 790, 120), (-230, 790, 285), 12, "steel", 14)
    mesh.torus("z_feed_wheel", (-230, 790, 305), 58, 8, "steel_dark", "xy", major_segments=36, minor_segments=8)
    mesh.cylinder("z_feed_handle", (-178, 790, 305), (-135, 820, 305), 7, "steel", 10)
    mesh.sphere("z_feed_knob", (-135, 820, 305), 18, "red_knob", 8, 14)

    # Concentric swivel base below the two orthogonal pitch axes.
    ball_center = (45, 1042, 10)
    pivot = ball_center
    mesh.cylinder("yaw_base_lower", (45, 886, 10), (45, 910, 10), 143, "machine_green_dark", 48)
    mesh.cylinder("yaw_base_bearing", (45, 910, 10), (45, 932, 10), 126, "steel_dark", 48)
    mesh.cylinder("yaw_base_upper", (45, 932, 10), (45, 955, 10), 116, "cast_iron", 48)
    mesh.torus("yaw_base_rim", (45, 932, 10), 130, 7, "steel", "xz", major_segments=72, minor_segments=10)
    for i in range(73):
        a = math.radians(i * 5)
        radial = (math.cos(a), 0, math.sin(a))
        tick_length = 16 if i % 9 == 0 else 10 if i % 3 == 0 else 6
        mesh.cylinder(
            f"yaw_scale_tick_{i:02d}",
            add((45, 954, 10), mul(radial, 132 - tick_length)),
            add((45, 954, 10), mul(radial, 132)),
            1.25 if i % 3 else 1.7,
            "scale_white",
            8,
        )
    mesh.cylinder("yaw_zero_pointer", (45, 957, 151), (45, 957, 125), 3, "layout_red", 10)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        x, z = 45 + math.cos(a) * 112, 10 + math.sin(a) * 112
        mesh.cylinder(f"yaw_base_bolt_{i}", (x, 948, z), (x, 966, z), 7.5, "steel_light", 16)
        mesh.cylinder(f"yaw_base_bolt_head_{i}", (x, 964, z), (x, 972, z), 12, "steel_dark", 18)

    # Cast support cheeks carry the left-right trunnion through the ball centre.
    mesh.box("left_trunnion_pedestal", (-105, 986, 10), (58, 122, 104), "machine_green")
    mesh.box("right_trunnion_pedestal", (195, 986, 10), (58, 122, 104), "machine_green")
    mesh.cylinder("fr_axis_left", (-177, 1042, 10), (-111, 1042, 10), 31, "steel_dark", 28)
    mesh.cylinder("fr_axis_right", (201, 1042, 10), (267, 1042, 10), 31, "steel_dark", 28)
    mesh.cylinder("fr_axis_left_bearing", (-149, 1042, 10), (-119, 1042, 10), 44, "machine_green", 32)
    mesh.cylinder("fr_axis_right_bearing", (209, 1042, 10), (239, 1042, 10), 44, "machine_green", 32)

    # Cast C-yoke around the ball equator. The additional video reference shows
    # this as a low, nearly horizontal holder rather than a vertical arch.
    outer_ring_center = (45, 1035, 10)
    mesh.torus("fr_outer_gimbal", outer_ring_center, 139, 19, "cast_iron", "xz", start=math.radians(122), end=math.radians(418), major_segments=68, minor_segments=14)
    mesh.torus("fr_outer_gimbal_inner_rib", outer_ring_center, 139, 10, "machine_green_light", "xz", start=math.radians(122), end=math.radians(418), major_segments=68, minor_segments=10)
    mesh.cylinder("fr_yoke_left_bridge", (-119, 1042, 10), (-91, 1042, 10), 30, "machine_green", 24)
    mesh.cylinder("fr_yoke_right_bridge", (181, 1042, 10), (209, 1042, 10), 30, "machine_green", 24)
    # The inner holder is the nearly horizontal C-shaped ring seen around the
    # upper hemisphere. Its front opening keeps the drill path unobstructed.
    upper_ring_center = (45, 1101, 10)
    mesh.torus("side_inner_gimbal", upper_ring_center, 119, 17, "machine_green", "xz", start=math.radians(125), end=math.radians(415), major_segments=64, minor_segments=14)
    mesh.torus("side_inner_gimbal_rib", upper_ring_center, 119, 9, "machine_green_light", "xz", start=math.radians(125), end=math.radians(415), major_segments=64, minor_segments=10)
    mesh.cylinder("side_axis_front", (45, 1042, 132), (45, 1042, 204), 29, "steel_dark", 28)
    mesh.cylinder("side_axis_back", (45, 1042, -184), (45, 1042, -112), 29, "steel_dark", 28)
    mesh.cylinder("side_axis_front_bearing", (45, 1042, 147), (45, 1042, 181), 42, "machine_green", 32)

    # Large polished graduation collars and their mechanically linked handles.
    side_scale_center = (-190, 1042, 10)
    add_graduated_ring(mesh, "side_scale_disc", side_scale_center, (-1, 0, 0), (0, 1, 0), 86, 31, "yz")
    add_spoked_handle(mesh, "side_lever", (-211, 1042, 10), (-1, 0, 0), (0, 1, 0), (0, 0, 1), 92, 3)
    fr_scale_center = (45, 1042, 210)
    add_graduated_ring(mesh, "fr_scale_disc", fr_scale_center, (0, 0, 1), (0, 1, 0), 82, 29, "xy")
    add_spoked_handle(mesh, "fr_lever", (45, 1042, 225), (0, 0, 1), (1, 0, 0), (0, 1, 0), 88, 2)

    # Lower spherical seat, equatorial retaining bar and the upper horseshoe clamp.
    mesh.cylinder("ball_cradle_neck", (45, 950, 10), (45, 977, 10), 88, "machine_green_dark", 40)
    mesh.torus("lower_ball_cup", (45, 972, 10), 91, 16, "cast_iron", "xz", major_segments=56, minor_segments=12)
    mesh.torus("lower_ball_cup_liner", (45, 978, 10), 88, 5, "black", "xz", major_segments=56, minor_segments=10)
    retaining_path = [(-98, 1010, 101), (-58, 1000, 112), (45, 994, 118), (148, 1000, 112), (188, 1010, 101)]
    mesh.tube("equatorial_retaining_bar", retaining_path, 17, "cast_iron", 14)
    mesh.tube("equatorial_retaining_rib", [(-92, 1013, 108), (45, 1002, 126), (182, 1013, 108)], 7, "machine_green_light", 12)
    mesh.box("front_clamp_strut", (45, 1044, 118), (38, 102, 28), "cast_iron")
    mesh.cylinder("front_clamp_screw", (45, 1077, 124), (45, 1077, 164), 10, "steel", 20)
    mesh.sphere("front_clamp_ball_handle", (45, 1077, 179), 27, "steel_light", 12, 24)

    # Two radial screw shoes close the open front of the horseshoe clamp.
    for i, angle in enumerate((55, 125)):
        a = math.radians(angle)
        radial = (math.cos(a), 0, math.sin(a))
        pad = add(upper_ring_center, mul(radial, 99))
        ring_edge = add(upper_ring_center, mul(radial, 119))
        outside = add(upper_ring_center, mul(radial, 151))
        cap = add(upper_ring_center, mul(radial, 163))
        mesh.cylinder(f"upper_clamp_screw_{i}", pad, outside, 8.5, "steel", 18)
        mesh.cylinder(f"upper_clamp_pad_{i}", add(pad, mul(radial, -6)), add(pad, mul(radial, 7)), 18, "black", 20)
        mesh.cylinder(f"upper_clamp_knurl_{i}", ring_edge, outside, 17, "steel_light", 24)
        mesh.sphere(f"upper_clamp_cap_{i}", cap, 19, "steel_light", 10, 20)
    ring_lock_root = (169, 1101, 96)
    ring_lock_end = (222, 1150, 133)
    mesh.cylinder("horseshoe_ring_lock_lever", ring_lock_root, ring_lock_end, 7, "steel", 14)
    mesh.sphere("horseshoe_ring_lock_knob", ring_lock_end, 17, "red_knob", 9, 16)

    # Axis locks and table clamp handles visible around the slide plate.
    for index, point in enumerate(((-90, 900, 175), (180, 900, 175), (-90, 900, -155), (180, 900, -155))):
        mesh.cylinder(f"table_lock_{index}", point, (point[0], point[1] + 48, point[2]), 7, "steel", 14)
        mesh.sphere(f"table_lock_knob_{index}", (point[0], point[1] + 61, point[2]), 16, "red_knob", 8, 14)

    # Regulation-size ball and surface grip-center marker.
    mesh.sphere("bowling_ball", ball_center, 109.1565, "ball", rings=24, segments=48)
    mesh.sphere("grip_center_marker", (45, 1151.8, 10), 7.5, "layout_red", rings=8, segments=16)

    mesh.write()
    print(f"Wrote {OBJ_PATH} ({OBJ_PATH.stat().st_size:,} bytes)")
    print(f"Wrote {MTL_PATH} ({MTL_PATH.stat().st_size:,} bytes)")
    print(f"Wrote {MODEL_JS_PATH} ({MODEL_JS_PATH.stat().st_size:,} bytes)")
    print(f"Vertices: {len(mesh.vertices):,}; parts: {len(mesh.parts):,}")


if __name__ == "__main__":
    build_model()
