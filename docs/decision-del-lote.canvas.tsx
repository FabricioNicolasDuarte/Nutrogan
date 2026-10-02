import { useState } from "react";
import {
  Callout,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

type Oficio = "Todos" | "Zootecnia" | "Agronomía" | "Veterinaria";

const DECISIONES: {
  oficio: Exclude<Oficio, "Todos">;
  dato: string;
  decision: string;
  noInventar: string;
  estado: string;
  tone: "success" | "warning" | "info";
}[] = [
  {
    oficio: "Zootecnia",
    dato: "Dos pesos con fecha",
    decision: "El lote gana o pierde kilos por día. Si pierde, no conviene seguir igual.",
    noInventar: "Si falta un peso, el resultado queda vacío.",
    estado: "Ya se calcula",
    tone: "success",
  },
  {
    oficio: "Zootecnia",
    dato: "Condición 1 a 9",
    decision: "Si el animal está bajo, explica por qué dejó de ganar. Sirve para bajar la exigencia o revisar comida y sanidad.",
    noInventar: "La foto propone. La persona confirma. Sin señal, el número lo anota quien está en el potrero.",
    estado: "Ya alerta si está baja",
    tone: "success",
  },
  {
    oficio: "Zootecnia",
    dato: "Cabezas y hectáreas del potrero",
    decision: "Carga real: cuántas cabezas hay por hectárea. Si el verde baja, se ve si la causa es el exceso de animales.",
    noInventar: "No convertir cabezas en equivalente vaca si la categoría no está cargada.",
    estado: "En la ficha de decisión",
    tone: "success",
  },
  {
    oficio: "Agronomía",
    dato: "Días en el potrero, vigor satelital y milímetros",
    decision: "Rotar o aliviar: el lote lleva muchos días, el verde cayó y llovió poco.",
    noInventar: "El satélite no es una balanza de pasto. No decir cuántos kilos de materia seca quedan.",
    estado: "En la ficha de decisión",
    tone: "success",
  },
  {
    oficio: "Veterinaria",
    dato: "Análisis de agua del potrero",
    decision: "Si el agua está en riesgo, esa aguada puede frenar la ganancia antes que la comida.",
    noInventar: "No hay sensor en vivo. Manda el análisis cargado y, al final, el laboratorio.",
    estado: "Ya pinta el semáforo",
    tone: "success",
  },
  {
    oficio: "Veterinaria",
    dato: "Lectura fecal y anomalía confirmadas",
    decision: "Si hay signos de parásitos o algo serio, se revisa sanidad antes de seguir engordando.",
    noInventar: "No es un diagnóstico ni reemplaza al veterinario.",
    estado: "Ya entra en la alerta",
    tone: "success",
  },
  {
    oficio: "Zootecnia",
    dato: "Comida usada, su precio y los kilos ganados",
    decision: "Cuánto costó la comida de cada kilo ganado. Con el precio de venta, si conviene terminarlo en el campo.",
    noInventar: "Sin dos pesos no hay kilo ganado. Sin precio de la bolsa no hay costo. Sin cotización no hay margen.",
    estado: "En la ficha de decisión",
    tone: "success",
  },
];

export default function NutroganDecision() {
  const [oficio, setOficio] = useState<Oficio>("Todos");
  const filas = DECISIONES.filter((d) => oficio === "Todos" || d.oficio === oficio);

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>De registros sueltos a una decisión</H1>
        <Text tone="secondary">
          AgriWebb, Huella y Ganado.co organizan el animal. Nutrogan ya mide el lote en el potrero,
          sin señal, con satélite, agua de laboratorio y visión que la persona confirma. Lo que
          falta es leer esos datos juntos y decir qué se puede hacer hoy.
        </Text>
      </Stack>

      <Row gap={16} align="end">
        <Stat value="7" label="Decisiones con datos que ya se cargan" />
        <Stat value="7" label="Entran en la ficha de decisión" tone="success" />
        <Stat value="0" label="Sensores nuevos" />
      </Row>

      <Callout tone="warning" title="Qué no copiar del mercado">
        Collares, balanzas que hablan solas, blockchain o un modelo que anticipe enfermedades
        piden hardware o inventan un diagnóstico. Nutrogan decide con lo cargado. Si un dato no
        está, la pantalla muestra el hueco.
      </Callout>

      <H2>Cómo deciden las otras herramientas</H2>
      <Table
        headers={["Herramienta", "Unidad", "Qué automatiza", "Límite frente a Nutrogan"]}
        rows={[
          [
            "AgriWebb",
            "Animal y potrero",
            "Días de pastoreo si alguien cargó cuánto pasto hay",
            "Esa cuenta pide oferta de forraje. El satélite de Nutrogan no la reemplaza.",
          ],
          [
            "Huella",
            "Cada animal",
            "Manga, condición, rotación y trazabilidad",
            "Ordena la nube. No junta vigor satelital, agua de laboratorio y costo del kilo.",
          ],
          [
            "Ganado.co",
            "Cada animal",
            "Ganancia diaria y proyecciones",
            "Promete anticipar problemas de salud. Nutrogan no diagnostica.",
          ],
          [
            "Nutrogan hoy",
            "El lote",
            "Kilos por día, condición baja, agua, pasto débil con hacienda, fecal y anomalía",
            "Cada aviso vive en su pantalla. Nadie ve la decisión completa.",
          ],
        ]}
        rowTone={["info", "info", "warning", "success"]}
        striped
      />
      <Text size="small" tone="tertiary">
        Fuentes: sitios de AgriWebb, Huella y Ganado.co, consultados en octubre de 2026. La fila de
        Nutrogan sale del producto actual.
      </Text>

      <Divider />

      <H2>Lo que cada oficio ya puede contestar</H2>
      <Text tone="secondary">
        Zootecnia mira si el lote produce. Agronomía mira si el potrero aguanta. Veterinaria mira
        si el agua o la sanidad explican la baja. Las tres usan números cargados, no un modelo que
        adivine.
      </Text>
      <Row gap={8} wrap>
        {(["Todos", "Zootecnia", "Agronomía", "Veterinaria"] as Oficio[]).map((item) => (
          <Pill key={item} active={oficio === item} onClick={() => setOficio(item)}>
            {item}
          </Pill>
        ))}
      </Row>
      <Table
        headers={["Oficio", "Dato ya cargado", "Decisión", "Estado"]}
        rows={filas.map((d) => [d.oficio, d.dato, d.decision, d.estado])}
        rowTone={filas.map((d) => d.tone)}
        striped
      />
      <Stack gap={6}>
        {filas.map((d) => (
          <Text key={d.dato} size="small" tone="secondary">
            {d.dato}: {d.noInventar}
          </Text>
        ))}
      </Stack>

      <H2>La pantalla que vuelve útil a la aplicación</H2>
      <Grid columns={2} gap={16}>
        <Stack gap={8}>
          <H3>Una pregunta por lote</H3>
          <Text>
            ¿Sigo, roto, reviso sanidad o el kilo ya no cierra? Cada renglón muestra el dato, la
            lectura y qué falta. Si falta el segundo peso, no aparece una ganancia. Si falta el
            precio de la bolsa, no aparece un margen.
          </Text>
        </Stack>
        <Stack gap={8}>
          <H3>Reglas a la vista</H3>
          <Text>
            La condición baja, el agua en riesgo, el verde débil con animales encima y el fecal
            con signos ya tienen umbral. La pantalla los nombra. No esconde la cuenta detrás de
            una frase de inteligencia artificial.
          </Text>
        </Stack>
      </Grid>

      <Divider />

      <H2>Dónde está en la app</H2>
      <Table
        headers={["Lugar", "Qué muestra"]}
        rows={[
          ["Qué decidir", "Los lotes activos, cada uno con su veredicto"],
          ["Ficha del lote", "Los siete renglones y la foto confirmada"],
          ["Modo campo", "El botón Decidir, con la misma lectura"],
          ["Alertas y resumen diario", "Rotar cuando se juntan días, vigor bajo y poca lluvia"],
        ]}
        rowTone={["success", "success", "success", "info"]}
      />
      <Callout tone="neutral" title="La reproducción queda afuera de esta cuenta">
        Servicio, tacto y parto sirven como historial. No explican solos los kilos por día ni el
        costo de la comida. Meterlos en la fórmula inventaría un resultado que no se midió.
      </Callout>
    </Stack>
  );
}
