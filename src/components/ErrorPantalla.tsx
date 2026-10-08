import { Component, type ReactNode } from "react";

/** Si una pantalla falla al cargar datos, muestra el error y permite reintentar (en vez de quedarse "Cargando…"). */
export default class ErrorPantalla extends Component<{ children: ReactNode; clave: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { clave: string }) {
    if (prev.clave !== this.props.clave && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[22px] border border-[#F4B4B5] bg-white p-6">
        <h2 className="m-0 text-lg font-extrabold">No pudimos cargar esta sección</h2>
        <p className="m-0 text-sm text-tinta-2">{this.state.error.message}</p>
        <button type="button" onClick={() => location.reload()} className="adm-btn min-h-11 rounded-xl border-0 bg-rojo px-4 text-sm font-extrabold text-white">
          Reintentar
        </button>
      </div>
    );
  }
}
